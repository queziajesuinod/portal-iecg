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
// Reter o video completo (alem do audio) para gerar recortes/Shorts no portal.
const DOWNLOAD_VIDEO = process.env.HELPER_DOWNLOAD_VIDEO === 'true';
const VIDEO_MAX_HEIGHT = Number(process.env.VIDEO_MAX_HEIGHT || 720);
// Autenticacao do yt-dlp (contorna o "Sign in to confirm you're not a bot" do YouTube).
// Prioridade: cookies exportados (arquivo) > cookies do navegador local.
const YTDLP_COOKIES_FILE = process.env.YTDLP_COOKIES_FILE || '';
const YTDLP_COOKIES_FROM_BROWSER = process.env.YTDLP_COOKIES_FROM_BROWSER || '';
// Proxy (ex.: residencial) para o yt-dlp. Essencial quando o helper roda no VPS,
// pois o YouTube bloqueia IPs de datacenter no anti-bot mesmo com cookies.
// Formato: http://user:pass@host:porta  ou  socks5://host:porta
const YTDLP_PROXY = process.env.YTDLP_PROXY || '';

// Opcoes de rede/autenticacao aplicadas a cada download do yt-dlp.
function cookieOptions() {
  const opts = {};
  if (YTDLP_COOKIES_FILE) opts.cookies = YTDLP_COOKIES_FILE;
  else if (YTDLP_COOKIES_FROM_BROWSER) opts.cookiesFromBrowser = YTDLP_COOKIES_FROM_BROWSER;
  if (YTDLP_PROXY) opts.proxy = YTDLP_PROXY;
  return opts;
}

// O yt-dlp precisa de um runtime JS (Deno) para resolver o "n challenge" do YouTube.
// Sem ele, o YouTube devolve so miniaturas ("Requested format is not available").
// Garante que o Deno (instalado em ~/.deno/bin ou DENO_BIN_DIR) esteja no PATH do yt-dlp.
const DENO_BIN_DIR = process.env.DENO_BIN_DIR || path.join(os.homedir(), '.deno', 'bin');
const hasDeno = fs.existsSync(DENO_BIN_DIR);
if (hasDeno) {
  process.env.PATH = `${DENO_BIN_DIR}${path.delimiter}${process.env.PATH || ''}`;
}

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

async function listPendingVideos() {
  const params = { limit: 20 };
  if (activeChannelId) params.channelId = activeChannelId;
  const { data } = await api.get('/pending-videos', { params });
  return data?.items || [];
}

async function downloadAudio(youtubeUrl, videoId) {
  await ensureTmp();
  const outBase = path.join(TMP_DIR, videoId);
  const outTemplate = `${outBase}.%(ext)s`;

  await youtubedl(youtubeUrl, {
    output: outTemplate,
    format: 'bestaudio/best',
    extractAudio: true,
    audioFormat: 'mp3',
    audioQuality: AUDIO_BITRATE,
    noPlaylist: true,
    noWarnings: true,
    retries: 3,
    fragmentRetries: 3,
    ...cookieOptions(),
  });

  const expected = `${outBase}.mp3`;
  const stat = await fsp.stat(expected);
  return { path: expected, size: stat.size };
}

async function downloadVideo(youtubeUrl, videoId) {
  await ensureTmp();
  const outBase = path.join(TMP_DIR, `${videoId}-video`);
  const outTemplate = `${outBase}.%(ext)s`;

  await youtubedl(youtubeUrl, {
    output: outTemplate,
    // Melhor video ate a altura maxima + melhor audio, remuxado em mp4.
    format: `bestvideo[height<=${VIDEO_MAX_HEIGHT}]+bestaudio/best[height<=${VIDEO_MAX_HEIGHT}]`,
    mergeOutputFormat: 'mp4',
    noPlaylist: true,
    noWarnings: true,
    retries: 3,
    fragmentRetries: 3,
    ...cookieOptions(),
  });

  const expected = `${outBase}.mp4`;
  const stat = await fsp.stat(expected);
  return { path: expected, size: stat.size };
}

async function uploadVideo(videoId, videoPath) {
  const form = new FormData();
  form.append('video', fs.createReadStream(videoPath), {
    filename: `${videoId}.mp4`,
    contentType: 'video/mp4',
  });
  const { data } = await api.post(`/videos/${encodeURIComponent(videoId)}/video`, form, {
    headers: { ...form.getHeaders(), 'X-Helper-Token': HELPER_TOKEN },
    timeout: 1800000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return data;
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
  if (activeChannelId && video.channel?.id && video.channel.id !== activeChannelId) {
    console.warn(`  ⚠️  pulando ${video.videoId}: canal ${video.channel.channelName} (${video.channel.id}) nao bate com filtro ${activeChannelId}`);
    return;
  }
  const t0 = Date.now();
  const counter = maxVideosTotal > 0 ? `[${processedCount + 1}/${maxVideosTotal}] ` : '';
  const channelLog = video.channel?.channelName ? ` | ${video.channel.channelName}` : '';
  console.log(`▶ ${counter}${video.videoId}${channelLog} | ${video.title?.slice(0, 50)}`);
  let audioPath = null;
  let videoPath = null;
  try {
    const dl = await downloadAudio(video.youtubeUrl, video.videoId);
    audioPath = dl.path;
    const mb = (dl.size / 1024 / 1024).toFixed(2);
    console.log(`  ↓ audio baixado: ${mb} MB em ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    await uploadAudio(video.videoId, audioPath);
    console.log(`  ↑ audio enviado pro portal em ${((Date.now() - t0) / 1000).toFixed(1)}s ✅`);

    if (DOWNLOAD_VIDEO) {
      const vdl = await downloadVideo(video.youtubeUrl, video.videoId);
      videoPath = vdl.path;
      const vmb = (vdl.size / 1024 / 1024).toFixed(2);
      console.log(`  ↓ video baixado (≤${VIDEO_MAX_HEIGHT}p): ${vmb} MB`);
      await uploadVideo(video.videoId, videoPath);
      console.log(`  ↑ video enviado pro portal em ${((Date.now() - t0) / 1000).toFixed(1)}s total ✅`);
    }
    processedCount += 1;
  } catch (err) {
    const data = err.response?.data;
    const msg = data?.message || err.stderr?.toString?.()?.slice(-300) || err.message;
    console.error(`  ✖ falhou: ${msg}`);
  } finally {
    await cleanup(audioPath);
    await cleanup(videoPath);
  }
}

// Baixa SO o video (para videos antigos marcados para recortes/Shorts no portal).
async function processVideoOnly(video) {
  if (activeChannelId && video.channel?.id && video.channel.id !== activeChannelId) return;
  const t0 = Date.now();
  const channelLog = video.channel?.channelName ? ` | ${video.channel.channelName}` : '';
  console.log(`🎬 recorte: ${video.videoId}${channelLog} | ${video.title?.slice(0, 50)}`);
  let videoPath = null;
  try {
    const vdl = await downloadVideo(video.youtubeUrl, video.videoId);
    videoPath = vdl.path;
    const vmb = (vdl.size / 1024 / 1024).toFixed(2);
    console.log(`  ↓ video baixado (≤${VIDEO_MAX_HEIGHT}p): ${vmb} MB`);
    await uploadVideo(video.videoId, videoPath);
    console.log(`  ↑ video enviado pro portal em ${((Date.now() - t0) / 1000).toFixed(1)}s ✅`);
  } catch (err) {
    const msg = err.response?.data?.message || err.stderr?.toString?.()?.slice(-300) || err.message;
    console.error(`  ✖ falhou (recorte): ${msg}`);
  } finally {
    await cleanup(videoPath);
  }
}

async function tickPendingVideos() {
  try {
    const pending = await listPendingVideos();
    if (pending.length === 0) return;
    const limit = Math.min(MAX_PER_TICK, pending.length);
    console.log(`[${new Date().toLocaleTimeString()}] ${pending.length} video(s) para recorte, baixando ${limit}...`);
    for (let i = 0; i < limit; i += 1) {
      await processVideoOnly(pending[i]);
    }
  } catch (err) {
    if (![401, 403, 503].includes(err.response?.status)) {
      console.error('[recortes] erro:', err.message);
    }
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
    } else {
      const remaining = maxVideosTotal > 0 ? maxVideosTotal - processedCount : Infinity;
      const limit = Math.min(MAX_PER_TICK, remaining, pending.length);
      console.log(`[${new Date().toLocaleTimeString()}] ${pending.length} pendente(s), processando ${limit}...`);
      for (let i = 0; i < limit; i += 1) {
        await processOne(pending[i]);
        if (shouldStop()) break;
      }
    }
    // Videos antigos marcados para recortes: baixa so o video.
    await tickPendingVideos();
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
  console.log(`   video: ${DOWNLOAD_VIDEO ? `SIM (≤${VIDEO_MAX_HEIGHT}p, para recortes/Shorts)` : 'nao (so audio)'}`);
  const authMode = YTDLP_COOKIES_FILE
    ? `cookies (arquivo: ${YTDLP_COOKIES_FILE})`
    : (YTDLP_COOKIES_FROM_BROWSER ? `cookies do navegador (${YTDLP_COOKIES_FROM_BROWSER})` : 'sem cookies (pode falhar no anti-bot)');
  console.log(`   auth yt-dlp: ${authMode}`);
  console.log(`   proxy yt-dlp: ${YTDLP_PROXY ? YTDLP_PROXY.replace(/\/\/[^@]*@/, '//***@') : 'nenhum'}`);
  console.log(`   deno (n-challenge): ${hasDeno ? DENO_BIN_DIR : '⚠️  NAO encontrado — instale o Deno (deno.land) senao o download falha!'}`);
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
  } else if (activeChannelId) {
    // Resolve o nome real do canal filtrado a partir do CHANNEL_ID do .env
    try {
      const channels = await listChannels();
      const found = channels.find((c) => c.id === activeChannelId);
      if (!found) {
        console.error(`❌ CHANNEL_ID="${activeChannelId}" nao corresponde a nenhum canal sincronizado.`);
        console.error('   Canais disponiveis:');
        channels.forEach((c) => console.error(`     ${c.id}  →  ${c.channelName} (${c.pendingCount} pendentes)`));
        process.exit(1);
      }
      activeChannelLabel = `${found.channelName} (${found.pendingCount} pendentes)`;
    } catch (err) {
      console.warn('⚠️  Nao consegui validar o CHANNEL_ID:', err.message);
      activeChannelLabel = activeChannelLabel || `canal ${activeChannelId}`;
    }
  } else {
    activeChannelLabel = 'todos os canais';
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
