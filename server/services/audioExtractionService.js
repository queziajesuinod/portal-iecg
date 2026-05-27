const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const crypto = require('crypto');

const YT_DLP_BIN = process.env.YT_DLP_PATH || 'yt-dlp';
const YT_DLP_COOKIES_PATH = process.env.YT_DLP_COOKIES_PATH || '';
const YT_DLP_COOKIES_FROM_BROWSER = process.env.YT_DLP_COOKIES_FROM_BROWSER || '';
const YT_DLP_EXTRA_ARGS = process.env.YT_DLP_EXTRA_ARGS || '';

let activeProcess = null;

function parseExtraArgs(raw) {
  return String(raw || '')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function runYtDlp(args, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    activeProcess = proc;
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (onProgress) onProgress(text);
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => {
      activeProcess = null;
      if (err.code === 'ENOENT') {
        reject(new Error('yt-dlp não encontrado. Instale: pip install yt-dlp (ou ajuste YT_DLP_PATH)'));
      } else {
        reject(err);
      }
    });
    proc.on('close', (code, signal) => {
      activeProcess = null;
      if (code === 0) resolve({ stderr });
      else if (signal) reject(new Error(`yt-dlp interrompido (signal ${signal})`));
      else reject(new Error(`yt-dlp falhou (exit ${code}): ${stderr || 'sem stderr'}`));
    });
  });
}

function killActiveDownload() {
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill('SIGTERM');
    return true;
  }
  return false;
}

async function downloadAudio(videoId, { format = 'opus' } = {}) {
  const tmpDir = path.join(os.tmpdir(), 'iecg-yt-audio');
  await fs.mkdir(tmpDir, { recursive: true });

  const id = crypto.randomBytes(4).toString('hex');
  const basePath = path.join(tmpDir, `yt-${videoId}-${id}`);
  const outputTemplate = `${basePath}.%(ext)s`;
  const expectedFinalPath = `${basePath}.${format}`;

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [
    '--format', 'bestaudio/best',
    '--extract-audio',
    '--audio-format', format,
    '--audio-quality', '0',
    '--no-playlist',
    '--no-warnings',
    '--retries', '3',
    '-o', outputTemplate,
  ];

  // YouTube pode exigir autenticação para driblar "Sign in to confirm you’re not a bot".
  // Prioridade: arquivo de cookies > cookies-from-browser.
  if (YT_DLP_COOKIES_PATH) {
    args.push('--cookies', YT_DLP_COOKIES_PATH);
  } else if (YT_DLP_COOKIES_FROM_BROWSER) {
    args.push('--cookies-from-browser', YT_DLP_COOKIES_FROM_BROWSER);
  }

  if (process.env.FFMPEG_PATH) {
    args.push('--ffmpeg-location', process.env.FFMPEG_PATH);
  }

  if (YT_DLP_EXTRA_ARGS) {
    args.push(...parseExtraArgs(YT_DLP_EXTRA_ARGS));
  }

  args.push(url);

  await runYtDlp(args);

  await fs.access(expectedFinalPath);
  return expectedFinalPath;
}

async function cleanupFile(filePath) {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => {});
}

module.exports = {
  downloadAudio,
  cleanupFile,
  killActiveDownload,
};
