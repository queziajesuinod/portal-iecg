const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { YoutubeVideo, VideoTranscript, VideoClip } = require('../models');
const ffmpeg = require('./ffmpegService');

const TARGET_W = 1080;
const TARGET_H = 1920;
const TARGET_AR = 9 / 16;
const GRID_STEP = 0.25; // segundos entre keyframes de crop
const EMA_ALPHA = 0.3; // suavizacao do movimento do rosto
const STATIC_THRESHOLD_PX = 8; // abaixo disso, trata como orador parado -> crop estatico
const FACE_TRACK_SCRIPT = path.join(__dirname, '..', 'scripts', 'face_track.py');

// Estilo da legenda queimada (ASS)
const CAPTION_FONT_SIZE = 46;
const CAPTION_MARGIN_H = 60; // MarginL / MarginR (px)
const CAPTION_MARGIN_V = 820; // MarginV (px)

function getClipRoot() {
  return process.env.CLIP_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'clips');
}

function getPythonBin() {
  return process.env.FACE_TRACK_PYTHON_PATH
    || process.env.WHISPER_PYTHON_PATH
    || (process.platform === 'win32' ? 'python' : 'python3');
}

function makeEven(n) {
  const v = Math.round(n);
  return v % 2 === 0 ? v : v - 1;
}

// ───────────────────────── Rastreamento de rosto ─────────────────────────

async function runFaceTrack(videoPath, start, end) {
  const outJson = path.join(os.tmpdir(), `facetrack-${crypto.randomBytes(4).toString('hex')}.json`);
  const args = [FACE_TRACK_SCRIPT, videoPath, String(start), String(end), outJson, '4'];
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(getPythonBin(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', (c) => { stderr += c.toString(); });
      proc.on('error', reject);
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr.slice(-300) || `exit ${code}`))));
    });
    const raw = await fs.readFile(outJson, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[clipRender] face tracking indisponivel (${err.message}); usando crop central`);
    return null;
  } finally {
    await fs.unlink(outJson).catch(() => {});
  }
}

// Interpola as amostras de centro do rosto sobre uma grade regular e suaviza (EMA).
function buildCenterTrajectory(samples, srcW, duration) {
  const valid = (samples || [])
    .filter((s) => Number.isFinite(s.t) && Number.isFinite(s.cx))
    .sort((a, b) => a.t - b.t);
  if (valid.length === 0) return null;

  const times = [];
  for (let t = 0; t <= duration + 1e-6; t += GRID_STEP) times.push(Number(t.toFixed(3)));

  // Interpolacao linear das amostras (cx normalizado -> pixels).
  let j = 0;
  const interp = times.map((t) => {
    while (j < valid.length - 1 && valid[j + 1].t < t) j += 1;
    const a = valid[Math.min(j, valid.length - 1)];
    const b = valid[Math.min(j + 1, valid.length - 1)];
    let cx;
    if (t <= a.t || a === b) cx = a.cx;
    else if (t >= b.t) cx = b.cx;
    else cx = a.cx + (b.cx - a.cx) * ((t - a.t) / (b.t - a.t));
    return cx * srcW;
  });

  // Suavizacao EMA (ida e volta para nao atrasar o movimento).
  const fwd = [];
  interp.forEach((v, i) => fwd.push(i === 0 ? v : EMA_ALPHA * v + (1 - EMA_ALPHA) * fwd[i - 1]));
  const smooth = new Array(fwd.length);
  for (let i = fwd.length - 1; i >= 0; i -= 1) {
    smooth[i] = i === fwd.length - 1 ? fwd[i] : EMA_ALPHA * fwd[i] + (1 - EMA_ALPHA) * smooth[i + 1];
  }
  return times.map((t, i) => ({ t, cxPx: smooth[i] }));
}

// Define geometria do crop 9:16 e a trajetoria (estatica ou dinamica) de x.
function buildCropPlan(meta, samples, duration) {
  const { width: srcW, height: srcH } = meta;
  let cropW;
  let cropH;
  let y = 0;
  let trackable;

  if (srcW / srcH > TARGET_AR) {
    // Fonte mais larga que 9:16 -> recorta largura (altura cheia). Da pra seguir o rosto.
    cropH = makeEven(srcH);
    cropW = makeEven(srcH * TARGET_AR);
    trackable = true;
  } else {
    // Fonte mais alta/estreita -> recorta altura (largura cheia). Sem tracking horizontal.
    cropW = makeEven(srcW);
    cropH = makeEven(srcW / TARGET_AR);
    y = Math.max(0, Math.round((srcH - cropH) / 2));
    trackable = false;
  }

  const maxX = Math.max(0, srcW - cropW);
  const centerX = Math.round(maxX / 2);

  if (!trackable || maxX === 0) {
    return {
      cropW, cropH, y, mode: 'static', x: centerX
    };
  }

  const traj = buildCenterTrajectory(samples, srcW, duration);
  if (!traj) {
    return {
      cropW, cropH, y, mode: 'static', x: centerX
    };
  }

  const keyframes = traj.map(({ t, cxPx }) => ({
    t,
    x: Math.max(0, Math.min(maxX, Math.round(cxPx - cropW / 2))),
  }));

  const xs = keyframes.map((k) => k.x);
  const range = Math.max(...xs) - Math.min(...xs);
  if (range < STATIC_THRESHOLD_PX) {
    // Orador praticamente parado: crop estatico na mediana (evita micro-tremor).
    const sorted = [...xs].sort((a, b) => a - b);
    return {
      cropW, cropH, y, mode: 'static', x: sorted[Math.floor(sorted.length / 2)]
    };
  }

  return {
    cropW, cropH, y, mode: 'dynamic', keyframes, initialX: keyframes[0].x
  };
}

// ───────────────────────── Legendas (ASS) ─────────────────────────

function assTime(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.round((s - Math.floor(s)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function escapeAss(text) {
  return String(text || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .trim();
}

// Legenda no estilo Shorts/Reels: TUDO MAIUSCULO e sem nenhuma pontuacao.
// Mantem hifen/apostrofo dentro de palavras (ex.: NAO-SEI, D'AGUA) pra nao juntar letras.
function toCaption(text) {
  return escapeAss(text)
    .toUpperCase()
    .replace(/[.,;:!?¿¡…"“”«»()[\]{}/\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ajusta a legenda a largura util da tela, quebrando em no maximo duas linhas
// balanceadas. Insere \N (quebra manual do ASS) quando o texto nao cabe em uma linha.
function wrapCaption(text) {
  const availW = TARGET_W - CAPTION_MARGIN_H * 2;
  // Largura media aproximada de um caractere em Arial Bold maiusculo (~0.62 * fontsize).
  const maxChars = Math.max(1, Math.floor(availW / (CAPTION_FONT_SIZE * 0.62)));
  if (text.length <= maxChars) return text;

  const words = text.split(' ');
  if (words.length < 2) return text; // palavra unica gigante: deixa o libass lidar

  let best = null; // melhor equilibrio com as DUAS linhas dentro do limite
  let fallback = null; // melhor equilibrio geral (quando nao cabe em duas linhas)
  let line1 = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const line2 = words.slice(i).join(' ');
    const diff = Math.abs(line1.length - line2.length);
    if (fallback === null || diff < fallback.diff) fallback = { diff, line1, line2 };
    if (line1.length <= maxChars && line2.length <= maxChars && (best === null || diff < best.diff)) {
      best = { diff, line1, line2 };
    }
    line1 += ` ${words[i]}`;
  }
  const chosen = best || fallback;
  return `${chosen.line1}\\N${chosen.line2}`;
}

function buildAss(segments, start, end) {
  const duration = end - start;
  const dialogues = [];
  for (const seg of segments || []) {
    if (!(seg.end > start && seg.start < end)) continue;
    const s = Math.max(0, seg.start - start);
    const e = Math.min(duration, seg.end - start);
    if (e - s < 0.3) continue;
    const text = wrapCaption(toCaption(seg.text));
    if (!text) continue;
    dialogues.push(`Dialogue: 0,${assTime(s)},${assTime(e)},Legenda,,0,0,0,,${text}`);
  }
  if (!dialogues.length) return null;

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${TARGET_W}
PlayResY: ${TARGET_H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda, Arial, ${CAPTION_FONT_SIZE}, &H00FFFFFF, &H00000000, &H00000000, 1, 0, 0, 0, 100, 100, 0, 0, 3, 6, 0, 2, ${CAPTION_MARGIN_H}, ${CAPTION_MARGIN_H}, ${CAPTION_MARGIN_V}, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogues.join('\n')}
`;
}

function buildSendcmd(keyframes) {
  return `${keyframes.map((k) => `${k.t.toFixed(3)} crop x ${k.x};`).join('\n')}\n`;
}

// ───────────────────────── Render ─────────────────────────

async function renderClip(clipId, { onProgress } = {}) {
  const clip = await VideoClip.findByPk(clipId, {
    include: [{ model: YoutubeVideo, as: 'video' }],
  });
  if (!clip) throw new Error('Recorte nao encontrado');
  if (clip.status === 'rendering') throw new Error('Recorte ja esta renderizando');

  const { video } = clip;
  if (!video?.videoPath) throw new Error('Video completo nao esta em disco (baixe o video antes)');

  const start = Number(clip.startSeconds);
  const end = Number(clip.endSeconds);
  const duration = end - start;
  if (!(duration > 0)) throw new Error('Intervalo do recorte invalido');

  await clip.update({ status: 'rendering', errorMessage: null, renderProgress: 0 });

  const workDir = path.join(os.tmpdir(), `cliprender-${crypto.randomBytes(5).toString('hex')}`);
  try {
    await fs.mkdir(workDir, { recursive: true });
    await fs.mkdir(getClipRoot(), { recursive: true });

    const meta = await ffmpeg.probe(video.videoPath);

    // 1) Rastreamento de rosto (com fallback para crop central).
    const faceData = await runFaceTrack(video.videoPath, start, end);
    const plan = buildCropPlan(meta, faceData?.samples, duration);

    // 2) Legendas a partir dos segments.
    const transcript = await VideoTranscript.findOne({ where: { youtubeVideoId: video.id } });
    const ass = buildAss(transcript?.segments, start, end);

    // 3) Monta o filtergraph (arquivos por nome-base; ffmpeg roda com cwd=workDir).
    const parts = [];
    if (plan.mode === 'dynamic') {
      await fs.writeFile(path.join(workDir, 'cmds.txt'), buildSendcmd(plan.keyframes));
      parts.push('sendcmd=f=cmds.txt');
      parts.push(`crop=${plan.cropW}:${plan.cropH}:${plan.initialX}:${plan.y}`);
    } else {
      parts.push(`crop=${plan.cropW}:${plan.cropH}:${plan.x}:${plan.y}`);
    }
    parts.push(`scale=${TARGET_W}:${TARGET_H}`);
    if (ass) {
      await fs.writeFile(path.join(workDir, 'sub.ass'), ass);
      parts.push('subtitles=sub.ass');
    }
    const filter = parts.join(',');

    const outName = `${video.videoId}-${clip.id}.mp4`;
    const outPath = path.join(getClipRoot(), outName);

    const args = [
      '-y',
      '-ss', String(start),
      '-i', video.videoPath,
      '-t', String(duration),
      '-filter_complex', filter,
      '-c:v', 'libx264',
      '-preset', process.env.CLIP_FFMPEG_PRESET || 'veryfast',
      '-crf', process.env.CLIP_FFMPEG_CRF || '20',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outPath,
    ];

    console.log(`[clipRender] ${clip.id} | ${duration.toFixed(1)}s | crop ${plan.mode} | legenda=${ass ? 'sim' : 'nao'}`);

    // Progresso do ffmpeg: parseia "time=HH:MM:SS.xx" e grava a % (com throttle).
    let lastPct = 0;
    let lastAt = 0;
    const onFfmpegStderr = (chunk) => {
      if (onProgress) onProgress(chunk);
      const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(chunk);
      if (!m || !(duration > 0)) return;
      const secs = Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]);
      const pct = Math.max(0, Math.min(99, Math.round((secs / duration) * 100)));
      const now = Date.now();
      if (pct > lastPct && (pct - lastPct >= 3 || now - lastAt >= 1500)) {
        lastPct = pct;
        lastAt = now;
        VideoClip.update({ renderProgress: pct }, { where: { id: clip.id } }).catch(() => {});
      }
    };

    await ffmpeg.run(ffmpeg.getFfmpeg(), args, {
      cwd: workDir,
      timeoutMs: Number(process.env.CLIP_RENDER_TIMEOUT_MS || 600000),
      onStderr: onFfmpegStderr,
    });

    const stat = await fs.stat(outPath);
    await clip.update({
      status: 'rendered',
      filePath: outPath,
      fileSizeBytes: stat.size,
      errorMessage: null,
      renderProgress: 100,
    });
    console.log(`[clipRender] concluido ${outName} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    return clip;
  } catch (err) {
    await clip.update({ status: 'failed', errorMessage: err.message }).catch(() => {});
    console.error(`[clipRender] erro no recorte ${clip.id}:`, err.message);
    throw err;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Posicao horizontal do crop num instante (relativo ao inicio do recorte).
function cropXAt(plan, relSeconds) {
  if (plan.mode !== 'dynamic') return plan.x;
  let best = plan.keyframes[0];
  for (const k of plan.keyframes) {
    if (k.t <= relSeconds) best = k;
    else break;
  }
  return best.x;
}

/**
 * Gera frames de amostra do enquadramento 9:16 (com rastreamento aplicado), SEM renderizar
 * o clipe inteiro. Serve para o admin ver como o corte vai ficar antes de renderizar.
 * Retorna { mode, tracking, frames: [{ t, dataUrl }] } (imagens JPEG em base64).
 */
async function generatePreviewFrames(clipId, { count = 3 } = {}) {
  const clip = await VideoClip.findByPk(clipId, {
    include: [{ model: YoutubeVideo, as: 'video' }],
  });
  if (!clip) throw new Error('Recorte nao encontrado');
  const { video } = clip;
  if (!video?.videoPath) throw new Error('Video completo nao esta em disco (baixe o video antes)');

  const start = Number(clip.startSeconds);
  const end = Number(clip.endSeconds);
  const duration = end - start;
  if (!(duration > 0)) throw new Error('Intervalo do recorte invalido');

  const meta = await ffmpeg.probe(video.videoPath);
  const faceData = await runFaceTrack(video.videoPath, start, end);
  const plan = buildCropPlan(meta, faceData?.samples, duration);

  // Preview em tamanho reduzido (mantendo 9:16) para o payload ficar leve.
  const pw = Math.round(TARGET_W / 3);
  const ph = Math.round(TARGET_H / 3);

  const workDir = path.join(os.tmpdir(), `clippreview-${crypto.randomBytes(4).toString('hex')}`);
  await fs.mkdir(workDir, { recursive: true });
  try {
    const frames = [];
    for (let i = 0; i < count; i += 1) {
      const frac = count === 1 ? 0.5 : i / (count - 1);
      const relT = frac * duration;
      const absT = start + relT;
      const x = cropXAt(plan, relT);
      const outJpg = path.join(workDir, `f${i}.jpg`);
      const filter = `crop=${plan.cropW}:${plan.cropH}:${x}:${plan.y},scale=${pw}:${ph}`;
      // eslint-disable-next-line no-await-in-loop
      await ffmpeg.run(ffmpeg.getFfmpeg(), [
        '-y', '-ss', String(absT), '-i', video.videoPath,
        '-frames:v', '1', '-filter_complex', filter, '-q:v', '4', outJpg,
      ], { timeoutMs: 60000 });
      // eslint-disable-next-line no-await-in-loop
      const buf = await fs.readFile(outJpg);
      frames.push({ t: Number(absT.toFixed(1)), dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}` });
    }
    return { mode: plan.mode, tracking: !!(faceData && faceData.samples && faceData.samples.length), frames };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Remove os arquivos de clips publicados ha mais de N dias (libera disco).
 * Mantem o registro no banco (status published, youtubeShortId), so limpa o filePath.
 */
async function cleanupPublishedClips({ days } = {}) {
  const d = Number(days ?? process.env.CLIP_CLEANUP_DAYS ?? 7);
  if (!Number.isFinite(d) || d <= 0) return { removed: 0, disabled: true };

  const { Op } = require('sequelize');
  const cutoff = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const clips = await VideoClip.findAll({
    where: {
      status: 'published',
      publishedAt: { [Op.lt]: cutoff },
      filePath: { [Op.ne]: null },
    },
  });

  let removed = 0;
  for (const clip of clips) {
    try {
      if (clip.filePath) {
        // eslint-disable-next-line no-await-in-loop
        await fs.unlink(clip.filePath).catch(() => {});
      }
      // eslint-disable-next-line no-await-in-loop
      await clip.update({ filePath: null, fileSizeBytes: null });
      removed += 1;
    } catch (err) {
      console.warn(`[clipCleanup] falha ao limpar clip ${clip.id}: ${err.message}`);
    }
  }
  return { removed, total: clips.length, days: d };
}

module.exports = {
  renderClip,
  generatePreviewFrames,
  cleanupPublishedClips,
  getClipRoot,
};
