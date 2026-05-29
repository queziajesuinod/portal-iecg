require('dotenv').config();
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const readline = require('readline');
const axios = require('axios');
const FormData = require('form-data');
const youtubedl = require('youtube-dl-exec');

const PORTAL_URL = (process.env.PORTAL_URL || 'http://localhost:3005').replace(/\/+$/, '');
const { HELPER_TOKEN } = process.env;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 60000);
const AUDIO_BITRATE = process.env.AUDIO_BITRATE || '96';
const MAX_PER_TICK = Number(process.env.MAX_PER_TICK || 1);
const TMP_DIR = process.env.TMP_DIR || path.join(os.tmpdir(), 'iecg-helper');
const RUN_ONCE = process.argv.includes('--once');

let activeChannelId = process.env.CHANNEL_ID || '';
let activeChannelLabel = process.env.CHANNEL_NAME || '';
let maxVideosTotal = Number(process.env.MAX_VIDEOS_TOTAL || 0);
let processedCount = 0;

if (!HELPER_TOKEN) {
  console.error('❌ HELPER_TOKEN obrigatório no .env. Configure antes de iniciar.');
  process.exit(1);
}

async function ensureTmp() {
  await fsp.mkdir(TMP_DIR, { recursive: true });
}

const api = axios.create({
  baseURL: `${PORTAL_URL}/api/helper/youtube`,
  headers: { 'X-Helper-Token': HELPER_TOKEN },
  timeout: 30000,
});

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function listChannels() {
  const { data } = await api.get('/channels');
  return Array.isArray(data) ? data : [];
}

async function chooseChannelInteractive() {
  let channels;
  try {
    channels = await listChannels();
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 503) {
      throw err;
    }
    console.warn('⚠️  Falha ao listar canais (vai rodar com TODOS):', err.message);
    return { channelId: '', channelLabel: 'todos os canais' };
  }

  if (channels.length === 0) {
    console.log('⚠️  Nenhum canal sincronizado no portal.');
    return { channelId: '', channelLabel: 'todos os canais' };
  }

  console.log('');
  console.log('Canais disponíveis:');
  channels.forEach((c, idx) => {
    const tag = c.pendingCount > 0 ? `(${c.pendingCount} pendente${c.pendingCount > 1 ? 's' : ''})` : '(sem pendentes)';
    console.log(`  [${idx + 1}] ${c.channelName || c.ownerName || c.channelId} ${tag}`);
  });
  console.log('  [0] Todos os canais');
  console.log('');

  const totalPending = channels.reduce((acc, c) => acc + (c.pendingCount || 0), 0);
  const answer = await prompt(`Escolha (1-${channels.length} ou 0 pra todos) [0]: `);
  const choice = Number(answer || 0);

  if (Number.isNaN(choice) || choice < 0 || choice > channels.length) {
    console.log('⚠️  Escolha inválida. Usando "todos os canais".');
    return { channelId: '', channelLabel: `todos os canais (${totalPending} pendentes)` };
  }

  if (choice === 0) {
    return { channelId: '', channelLabel: `todos os canais (${totalPending} pendentes)` };
  }

  const picked = channels[choice - 1];
  return {
    channelId: picked.id,
    channelLabel: `${picked.channelName || picked.ownerName} (${picked.pendingCount} pendente${picked.pendingCount === 1 ? '' : 's'})`,
  };
}

async function askMaxVideos() {
  const answer = await prompt('Máximo de vídeos a baixar nesta sessão (Enter = ilimitado): ');
  if (!answer) return 0;
  const n = Number(answer);
  if (Number.isNaN(n) || n < 1) {
    console.log('⚠️  Valor inválido. Sem limite.');
    return 0;
  }
  return Math.floor(n);
}

async function listPending() {
  const params = { limit: 20 };
  if (activeChannelId) params.channelId = activeChannelId;
  const { data } = await api.get('/pending-audios', { params });
  return data?.items || [];
}

async function downloadAudio(youtubeUrl, videoId) {
  await ensureTmp();
  const outBase = path.join(TMP_DIR, videoId);
  const outTemplate = `${outBase}.%(ext)s`;

  await youtubedl(youtubeUrl, {
    output: outTemplate,
    extractAudio: true,
    audioFormat: 'mp3',
    audioQuality: AUDIO_BITRATE,
    noPlaylist: true,
    noWarnings: true,
    retries: 3,
    fragmentRetries: 3,
  });

  const expected = `${outBase}.mp3`;
  const stat = await fsp.stat(expected);
  return { path: expected, size: stat.size };
}

async function uploadAudio(videoId, audioPath) {
  const form = new FormData();
  form.append('audio', fs.createReadStream(audioPath), {
    filename: `${videoId}.mp3`,
    contentType: 'audio/mpeg',
  });
  const { data } = await api.post(`/videos/${encodeURIComponent(videoId)}/audio`, form, {
    headers: { ...form.getHeaders(), 'X-Helper-Token': HELPER_TOKEN },
    timeout: 600000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return data;
}

async function cleanup(filePath) {
  if (!filePath) return;
  await fsp.unlink(filePath).catch(() => {});
}

async function processOne(video) {
  const t0 = Date.now();
  const counter = maxVideosTotal > 0 ? `[${processedCount + 1}/${maxVideosTotal}] ` : '';
  console.log(`▶ ${counter}${video.videoId} | ${video.title?.slice(0, 60)}`);
  let audioPath = null;
  try {
    const dl = await downloadAudio(video.youtubeUrl, video.videoId);
    audioPath = dl.path;
    const mb = (dl.size / 1024 / 1024).toFixed(2);
    console.log(`  ↓ baixado: ${mb} MB em ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    await uploadAudio(video.videoId, audioPath);
    console.log(`  ↑ enviado pro portal em ${((Date.now() - t0) / 1000).toFixed(1)}s total ✅`);
    processedCount += 1;
  } catch (err) {
    const data = err.response?.data;
    const msg = data?.message || err.stderr?.toString?.()?.slice(-300) || err.message;
    console.error(`  ✖ falhou: ${msg}`);
  } finally {
    await cleanup(audioPath);
  }
}

function shouldStop() {
  return maxVideosTotal > 0 && processedCount >= maxVideosTotal;
}

async function tick() {
  if (shouldStop()) return;
  try {
    const pending = await listPending();
    if (pending.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] sem videos pendentes em ${activeChannelLabel || 'todos os canais'}`);
      return;
    }
    const remaining = maxVideosTotal > 0 ? maxVideosTotal - processedCount : Infinity;
    const limit = Math.min(MAX_PER_TICK, remaining, pending.length);
    console.log(`[${new Date().toLocaleTimeString()}] ${pending.length} pendente(s), processando ${limit}...`);
    for (let i = 0; i < limit; i += 1) {
      await processOne(pending[i]);
      if (shouldStop()) break;
    }
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      console.error(`❌ Autenticação falhou (${err.response.status}). Verifique HELPER_TOKEN.`);
    } else if (err.response?.status === 503) {
      console.error('❌ HELPER_TOKENS nao configurado no servidor (.env da VPS).');
    } else {
      console.error('[tick] erro:', err.message);
    }
  }
}

async function main() {
  console.log('🤝 IECG Helper — download de audio do YouTube → portal');
  console.log(`   portal: ${PORTAL_URL}`);
  console.log(`   polling: ${POLL_INTERVAL_MS / 1000}s | max por ciclo: ${MAX_PER_TICK} | bitrate: ${AUDIO_BITRATE}kbps`);
  console.log(`   tmp dir: ${TMP_DIR}`);
  console.log('');

  if (!activeChannelId && !RUN_ONCE) {
    try {
      const picked = await chooseChannelInteractive();
      activeChannelId = picked.channelId;
      activeChannelLabel = picked.channelLabel;
      maxVideosTotal = await askMaxVideos();
    } catch (err) {
      console.error('❌ Falha no setup interativo:', err.message);
      process.exit(1);
    }
  } else if (!activeChannelLabel) {
    activeChannelLabel = activeChannelId ? `canal ${activeChannelId}` : 'todos os canais';
  }

  console.log('');
  console.log(`   canal: ${activeChannelLabel}`);
  console.log(`   max total: ${maxVideosTotal > 0 ? maxVideosTotal : 'ilimitado'}`);
  console.log(`   modo: ${RUN_ONCE ? '--once (executa 1x e sai)' : 'loop (Ctrl+C pra sair)'}`);
  console.log('');

  await tick();
  if (RUN_ONCE || shouldStop()) {
    if (shouldStop()) {
      console.log('');
      console.log(`✅ Limite de ${maxVideosTotal} videos atingido. Encerrando.`);
    }
    return;
  }

  const intervalId = setInterval(async () => {
    await tick();
    if (shouldStop()) {
      clearInterval(intervalId);
      console.log('');
      console.log(`✅ Limite de ${maxVideosTotal} videos atingido. Encerrando.`);
      process.exit(0);
    }
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
