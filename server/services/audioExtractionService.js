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
  const input = String(raw || '').trim();
  if (!input) return [];

  const out = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        out.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) out.push(current);
  return out;
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

function buildBaseArgs({
  url, outputTemplate, format, formatSelector, jsRuntime, userAgent, playerClient,
}) {
  const args = [
    '--js-runtimes', jsRuntime,
    '--format', formatSelector,
    '--extract-audio',
    '--audio-format', format,
    '--audio-quality', '0',
    '--no-playlist',
    '--no-warnings',
    '--retries', '3',
    '-o', outputTemplate,
  ];
  if (playerClient) {
    args.push('--extractor-args', `youtube:player_client=${playerClient}`);
  }
  if (userAgent) {
    args.push('--user-agent', userAgent);
  }
  if (process.env.FFMPEG_PATH) {
    args.push('--ffmpeg-location', process.env.FFMPEG_PATH);
  }
  if (YT_DLP_EXTRA_ARGS) {
    args.push(...parseExtraArgs(YT_DLP_EXTRA_ARGS));
  }
  args.push(url);
  return args;
}

function isRetriableYtDlpError(err) {
  if (!err || !err.message) return false;
  const msg = err.message;
  return msg.includes('Requested format is not available')
    || msg.includes('Sign in to confirm')
    || msg.includes('Failed to extract any player response')
    || msg.includes('Video unavailable');
}

async function downloadAudio(videoId, { format = 'opus', cookies = null } = {}) {
  const ytDlpCookies = require('./ytDlpCookiesService');
  const tmpDir = path.join(os.tmpdir(), 'iecg-yt-audio');
  await fs.mkdir(tmpDir, { recursive: true });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const formatSelector = process.env.YT_DLP_FORMAT || 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best';
  const jsRuntime = process.env.YT_DLP_JS_RUNTIME || 'node';
  const userAgent = process.env.YT_DLP_USER_AGENT || '';

  // Player clients pra tentar em ordem. Se env definir, usa só esse (string única).
  // Senão, tenta vários em sequência até um funcionar.
  const playerClientChain = process.env.YT_DLP_PLAYER_CLIENTS
    ? [process.env.YT_DLP_PLAYER_CLIENTS]
    : [
      'tv_simply',
      'web_safari',
      'tv',
      'web',
      'mediaconnect',
      '', // tentativa final sem forçar nada (yt-dlp escolhe)
    ];

  // Prepara cookies (uma vez só pra todas as tentativas)
  let tempCookiesFile = null;
  if (cookies) {
    const normalized = ytDlpCookies.detectAndNormalize(cookies);
    tempCookiesFile = await ytDlpCookies.writeCookiesToTempFile(normalized);
  }

  try {
    let lastError = null;
    for (const playerClient of playerClientChain) {
      const id = crypto.randomBytes(4).toString('hex');
      const basePath = path.join(tmpDir, `yt-${videoId}-${id}`);
      const outputTemplate = `${basePath}.%(ext)s`;
      const expectedFinalPath = `${basePath}.${format}`;

      const args = buildBaseArgs({
        url, outputTemplate, format, formatSelector, jsRuntime, userAgent, playerClient,
      });

      // Insere cookies (depois dos args base, antes da URL final)
      if (tempCookiesFile) {
        args.splice(args.length - 1, 0, '--cookies', tempCookiesFile);
      } else if (YT_DLP_COOKIES_PATH) {
        args.splice(args.length - 1, 0, '--cookies', YT_DLP_COOKIES_PATH);
      } else if (YT_DLP_COOKIES_FROM_BROWSER) {
        args.splice(args.length - 1, 0, '--cookies-from-browser', YT_DLP_COOKIES_FROM_BROWSER);
      }

      try {
        const label = playerClient || '(default yt-dlp)';
        console.log(`[yt-dlp] tentando player_client=${label}...`);
        await runYtDlp(args);
        await fs.access(expectedFinalPath);
        console.log(`[yt-dlp] sucesso com player_client=${label}`);
        return expectedFinalPath;
      } catch (err) {
        lastError = err;
        if (!isRetriableYtDlpError(err)) {
          throw err;
        }
        console.warn(`[yt-dlp] falhou com player_client=${playerClient || '(default)'}: ${err.message.split('\n')[0]}`);
        // limpa arquivo parcial se existir
        await fs.unlink(expectedFinalPath).catch(() => {});
      }
    }
    throw lastError || new Error('Todos os player_clients falharam');
  } finally {
    if (tempCookiesFile) {
      await ytDlpCookies.cleanupCookiesFile(tempCookiesFile);
    }
  }
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
