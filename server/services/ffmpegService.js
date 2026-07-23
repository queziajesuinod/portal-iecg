const { spawn } = require('child_process');

// Resolve o binario: env explicito > pacote estatico (se instalado) > PATH do sistema.
function resolveBin(envVar, staticModule, fallback) {
  if (process.env[envVar]) return process.env[envVar];
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const mod = require(staticModule);
    const p = mod && (mod.path || mod);
    if (p && typeof p === 'string') return p;
  } catch (_) {
    // pacote nao instalado, cai pro PATH
  }
  return fallback;
}

function getFfmpeg() {
  return resolveBin('FFMPEG_PATH', 'ffmpeg-static', 'ffmpeg');
}

function getFfprobe() {
  return resolveBin('FFPROBE_PATH', 'ffprobe-static', 'ffprobe');
}

function run(bin, args, { onStderr, timeoutMs, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], cwd });
    let stdout = '';
    let stderr = '';
    let timer = null;
    if (timeoutMs) {
      timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Timeout apos ${timeoutMs}ms: ${bin}`));
      }, timeoutMs);
    }
    proc.stdout.on('data', (c) => { stdout += c.toString(); });
    proc.stderr.on('data', (c) => {
      const t = c.toString();
      stderr += t;
      if (onStderr) onStderr(t);
    });
    proc.on('error', (err) => {
      if (timer) clearTimeout(timer);
      if (err.code === 'ENOENT') {
        reject(new Error(`Binario nao encontrado: ${bin}. Instale o ffmpeg ou ajuste FFMPEG_PATH/FFPROBE_PATH.`));
      } else {
        reject(err);
      }
    });
    proc.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${bin} falhou (exit ${code}): ${stderr.slice(-800)}`));
    });
  });
}

function parseFrameRate(str) {
  if (!str) return null;
  const [num, den] = String(str).split('/').map(Number);
  if (den) return num / den;
  return num || null;
}

async function probe(filePath) {
  const args = ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath];
  const { stdout } = await run(getFfprobe(), args);
  const data = JSON.parse(stdout);
  const videoStream = (data.streams || []).find((s) => s.codec_type === 'video');
  if (!videoStream) throw new Error('Nenhuma trilha de video encontrada');
  return {
    width: Number(videoStream.width),
    height: Number(videoStream.height),
    fps: parseFrameRate(videoStream.avg_frame_rate) || parseFrameRate(videoStream.r_frame_rate) || 30,
    duration: Number(data.format?.duration) || null,
  };
}

module.exports = {
  getFfmpeg,
  getFfprobe,
  run,
  probe,
};
