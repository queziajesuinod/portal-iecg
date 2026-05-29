require('dotenv').config();
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
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

async function listPending() {
  const { data } = await api.get('/pending-audios', { params: { limit: 20 } });
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
  console.log(`▶ ${video.videoId} | ${video.title?.slice(0, 60)}`);
  let audioPath = null;
  try {
    const dl = await downloadAudio(video.youtubeUrl, video.videoId);
    audioPath = dl.path;
    const mb = (dl.size / 1024 / 1024).toFixed(2);
    console.log(`  ↓ baixado: ${mb} MB em ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    await uploadAudio(video.videoId, audioPath);
    console.log(`  ↑ enviado pro portal em ${((Date.now() - t0) / 1000).toFixed(1)}s total ✅`);
  } catch (err) {
    const data = err.response?.data;
    const msg = data?.message || err.stderr?.toString?.()?.slice(-300) || err.message;
    console.error(`  ✖ falhou: ${msg}`);
  } finally {
    await cleanup(audioPath);
  }
}

async function tick() {
  try {
    const pending = await listPending();
    if (pending.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] sem videos pendentes`);
      return;
    }
    console.log(`[${new Date().toLocaleTimeString()}] ${pending.length} pendente(s), processando ate ${MAX_PER_TICK}...`);
    const batch = pending.slice(0, MAX_PER_TICK);
    for (const video of batch) {
      await processOne(video);
    }
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      console.error(`❌ Autenticação falhou (${err.response.status}). Verifique HELPER_TOKEN.`);
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
  if (RUN_ONCE) {
    console.log('   modo: --once (executa 1x e sai)');
  } else {
    console.log('   modo: loop (Ctrl+C pra sair)');
  }
  console.log('');

  await tick();
  if (RUN_ONCE) return;

  setInterval(tick, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
