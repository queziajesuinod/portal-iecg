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

function runYtDlpJson(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    activeProcess = proc;
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => { stdout += c.toString(); });
    proc.stderr.on('data', (c) => { stderr += c.toString(); });
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
      if (code === 0) {
        try { resolve(JSON.parse(stdout)); } catch (e) { reject(new Error(`Falha ao parsear JSON do yt-dlp: ${e.message}`)); }
      } else if (signal) {
        reject(new Error(`yt-dlp interrompido (signal ${signal})`));
      } else {
        reject(new Error(`yt-dlp falhou (exit ${code}): ${stderr || 'sem stderr'}`));
      }
    });
  });
}

function pickBestAudioFormat(formats) {
  if (!Array.isArray(formats) || !formats.length) return null;

  const scoreExt = (ext) => {
    if (ext === 'm4a') return 3;
    if (ext === 'webm' || ext === 'opus') return 2;
    return 1;
  };

  const audioOnly = formats.filter((f) => (f.vcodec === 'none' || !f.vcodec) && f.acodec && f.acodec !== 'none');
  if (audioOnly.length) {
    audioOnly.sort((a, b) => {
      const ext = scoreExt(b.ext) - scoreExt(a.ext);
      if (ext !== 0) return ext;
      return (b.abr || 0) - (a.abr || 0);
    });
    return {
      id: audioOnly[0].format_id, kind: 'audio-only', ext: audioOnly[0].ext, abr: audioOnly[0].abr
    };
  }

  const withAudio = formats.filter((f) => f.acodec && f.acodec !== 'none');
  if (withAudio.length) {
    withAudio.sort((a, b) => (b.tbr || b.abr || 0) - (a.tbr || a.abr || 0));
    return {
      id: withAudio[0].format_id, kind: 'combined', ext: withAudio[0].ext, abr: withAudio[0].abr
    };
  }

  return null;
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

function buildProbeArgs({
  url, jsRuntime, userAgent, playerClient,
}) {
  const args = [
    '--js-runtimes', jsRuntime,
    '--dump-single-json',
    '--no-download',
    '--no-playlist',
    '--no-warnings',
  ];
  if (playerClient) {
    args.push('--extractor-args', `youtube:player_client=${playerClient}`);
  }
  if (userAgent) {
    args.push('--user-agent', userAgent);
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
  // Se YT_DLP_FORMAT estiver vazio, faz discovery dinâmico via --dump-single-json.
  // Se setado (ex: "bestaudio/best"), usa como override e pula o probe.
  const formatOverride = process.env.YT_DLP_FORMAT || '';
  const jsRuntime = process.env.YT_DLP_JS_RUNTIME || 'node';
  const userAgent = process.env.YT_DLP_USER_AGENT || '';

  // Player clients pra tentar em ordem. Se env definir, usa só esse (string única).
  // Senão, tenta vários em sequência até um funcionar.
  // Ordem otimizada pra quando o bgutil-ytdlp-pot-provider está rodando:
  // 'web'/'web_safari'/'mweb' precisam de PO Token mas têm melhor compatibilidade;
  // 'tv_simply'/'tv' são fallback caso o provider esteja fora.
  const playerClientChain = process.env.YT_DLP_PLAYER_CLIENTS
    ? [process.env.YT_DLP_PLAYER_CLIENTS]
    : [
      'web',
      'web_safari',
      'mweb',
      'tv_simply',
      'tv',
      '', // tentativa final sem forçar nada (yt-dlp escolhe)
    ];

  // Prepara cookies (uma vez só pra todas as tentativas)
  let tempCookiesFile = null;
  if (cookies) {
    const normalized = ytDlpCookies.detectAndNormalize(cookies);
    tempCookiesFile = await ytDlpCookies.writeCookiesToTempFile(normalized);
  }

  const injectCookies = (args) => {
    if (tempCookiesFile) {
      args.splice(args.length - 1, 0, '--cookies', tempCookiesFile);
    } else if (YT_DLP_COOKIES_PATH) {
      args.splice(args.length - 1, 0, '--cookies', YT_DLP_COOKIES_PATH);
    } else if (YT_DLP_COOKIES_FROM_BROWSER) {
      args.splice(args.length - 1, 0, '--cookies-from-browser', YT_DLP_COOKIES_FROM_BROWSER);
    }
  };

  try {
    let lastError = null;
    for (const playerClient of playerClientChain) {
      const label = playerClient || '(default yt-dlp)';
      const id = crypto.randomBytes(4).toString('hex');
      const basePath = path.join(tmpDir, `yt-${videoId}-${id}`);
      const outputTemplate = `${basePath}.%(ext)s`;
      const expectedFinalPath = `${basePath}.${format}`;

      try {
        // Etapa 1: descobre formato (a menos que o usuário tenha forçado via env)
        let formatSelector = formatOverride;
        if (!formatSelector) {
          console.log(`[yt-dlp] descobrindo formatos com player_client=${label}...`);
          const probeArgs = buildProbeArgs({
            url, jsRuntime, userAgent, playerClient
          });
          injectCookies(probeArgs);
          const info = await runYtDlpJson(probeArgs);
          const picked = pickBestAudioFormat(info && info.formats);
          if (!picked) {
            console.warn(`[yt-dlp] sem formato de áudio compatível em player_client=${label}`);
            continue;
          }
          formatSelector = picked.id;
          console.log(`[yt-dlp] formato escolhido: ${picked.id} (${picked.kind}, ${picked.ext}, ${picked.abr || '?'}kbps)`);
        }

        // Etapa 2: download com o format_id explícito
        const args = buildBaseArgs({
          url, outputTemplate, format, formatSelector, jsRuntime, userAgent, playerClient,
        });
        injectCookies(args);

        console.log(`[yt-dlp] baixando com player_client=${label} format=${formatSelector}...`);
        await runYtDlp(args);
        await fs.access(expectedFinalPath);
        console.log(`[yt-dlp] sucesso com player_client=${label}`);
        return expectedFinalPath;
      } catch (err) {
        lastError = err;
        if (!isRetriableYtDlpError(err)) {
          throw err;
        }
        console.warn(`[yt-dlp] falhou com player_client=${label}: ${err.message.split('\n')[0]}`);
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
