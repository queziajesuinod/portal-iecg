const { Op } = require('sequelize');
const { YoutubeVideo, VideoTranscript, VideoClip } = require('../models');
const llmChain = require('./llmChainService');

// Teto absoluto de recortes por video (nao ultrapassar, mesmo via env).
const HARD_MAX_CLIPS = 5;

const DEFAULTS = {
  minClips: Number(process.env.CLIP_MIN_COUNT || 2),
  maxClips: Math.min(Number(process.env.CLIP_MAX_COUNT || 5), HARD_MAX_CLIPS),
  minSeconds: Number(process.env.CLIP_MIN_SECONDS || 15),
  maxSeconds: Number(process.env.CLIP_MAX_SECONDS || 75),
};

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

function buildSystemPrompt({
  minClips, maxClips, minSeconds, maxSeconds
}) {
  return `Você é um editor de conteúdo cristão que seleciona os melhores momentos de uma pregação/estudo para virarem recortes verticais (YouTube Shorts, Reels, TikTok).

Você recebe a transcrição dividida em segmentos numerados, cada um com um índice (#N) e um timestamp. Sua tarefa é escolher os trechos mais fortes para compartilhar.

CRITÉRIOS DE UM BOM RECORTE:
- Autossuficiente: faz sentido sozinho, sem precisar do resto da pregação.
- Tem um gancho, um ensinamento marcante, uma frase de impacto, uma história curta e completa, ou uma aplicação prática.
- Começa numa fronteira natural de fala (não corta no meio de uma ideia) e termina fechando o pensamento.
- Evite introduções, avisos, saudações, pedidos de oferta e trechos administrativos.

REGRAS:
- Escolha entre ${minClips} e ${maxClips} recortes, os MELHORES (qualidade acima de quantidade — se só houver 1 ótimo, retorne 1).
- Cada recorte deve durar entre ${minSeconds} e ${maxSeconds} segundos. Some a duração dos segmentos escolhidos (do startIndex ao endIndex) para respeitar isso.
- Os recortes NÃO podem se sobrepor.
- "startIndex" e "endIndex" são índices inteiros de segmentos (inclusivos), referentes aos #N fornecidos.
- "title": título curto e chamativo do recorte (máx 80 caracteres), em português.
- "caption": a frase/ensinamento central do trecho em texto puro (sem aspas desnecessárias), que pode virar legenda.
- "reason": 1 frase explicando por que esse trecho é forte.

FORMATO: responda APENAS com um objeto JSON válido, sem markdown, no formato:
{ "clips": [ { "startIndex": 0, "endIndex": 3, "title": "...", "caption": "...", "reason": "..." } ] }`;
}

function buildUserMessage(title, segments) {
  const lines = segments.map((seg, i) => `#${i} [${formatTime(seg.start)}] ${String(seg.text || '').trim()}`);
  return `Título do vídeo: ${title || '(sem título)'}\nTotal de segmentos: ${segments.length}\n\nSegmentos:\n${lines.join('\n')}`;
}

function clampInt(value, min, max) {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}

// Ajusta [start,end] em indices para respeitar min/max de duracao, sem estourar limites.
function fitDuration(segments, startIndex, endIndex, minSeconds, maxSeconds) {
  const lastIdx = segments.length - 1;
  let s = startIndex;
  let e = endIndex;
  const dur = () => Number(segments[e].end) - Number(segments[s].start);

  // Encolhe se passou do maximo (tira do fim primeiro, depois do inicio).
  while (dur() > maxSeconds && e > s) e -= 1;
  while (dur() > maxSeconds && s < e) s += 1;
  // Estende se ficou curto demais (adiciona do fim, depois do inicio).
  while (dur() < minSeconds && e < lastIdx) e += 1;
  while (dur() < minSeconds && s > 0) s -= 1;

  return { s, e, seconds: dur() };
}

function normalizeClips(rawClips, segments, cfg) {
  const lastIdx = segments.length - 1;
  const used = []; // intervalos [s,e] ja aceitos, para evitar sobreposicao
  const result = [];

  for (const raw of Array.isArray(rawClips) ? rawClips : []) {
    let startIndex = clampInt(raw.startIndex, 0, lastIdx);
    let endIndex = clampInt(raw.endIndex, 0, lastIdx);
    if (startIndex === null || endIndex === null) continue;
    if (endIndex < startIndex) [startIndex, endIndex] = [endIndex, startIndex];

    const fitted = fitDuration(segments, startIndex, endIndex, cfg.minSeconds, cfg.maxSeconds);
    if (fitted.seconds < Math.min(cfg.minSeconds, 5)) continue;

    // Descarta se sobrepoe um recorte ja aceito.
    const overlaps = used.some(([us, ue]) => fitted.s <= ue && fitted.e >= us);
    if (overlaps) continue;
    used.push([fitted.s, fitted.e]);

    const text = segments.slice(fitted.s, fitted.e + 1).map((sg) => String(sg.text || '').trim()).join(' ').trim();
    result.push({
      startSeconds: Number(Number(segments[fitted.s].start).toFixed(3)),
      endSeconds: Number(Number(segments[fitted.e].end).toFixed(3)),
      title: typeof raw.title === 'string' ? raw.title.trim().slice(0, 200) : null,
      caption: typeof raw.caption === 'string' && raw.caption.trim()
        ? raw.caption.trim()
        : text.slice(0, 280),
      reason: typeof raw.reason === 'string' ? raw.reason.trim() : null,
    });
  }

  // Ordena por tempo e limita a maxClips.
  result.sort((a, b) => a.startSeconds - b.startSeconds);
  return result.slice(0, cfg.maxClips);
}

/**
 * Gera sugestoes de recortes para um video (a partir dos segments) e persiste como VideoClip.
 * Substitui apenas os recortes ainda 'suggested' (preserva approved/rendered/published).
 */
async function suggestClips(youtubeVideoId, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  cfg.maxClips = Math.min(Number(cfg.maxClips) || DEFAULTS.maxClips, HARD_MAX_CLIPS);

  const video = await YoutubeVideo.findByPk(youtubeVideoId);
  if (!video) throw new Error('Video nao encontrado');

  const transcript = await VideoTranscript.findOne({ where: { youtubeVideoId } });
  const segments = transcript?.segments;
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('Video sem segments (timestamps). Rode o backfill/transcricao antes de sugerir recortes.');
  }

  const systemPrompt = buildSystemPrompt(cfg);
  const userMessage = buildUserMessage(video.title, segments);

  const { data, provider, model } = await llmChain.chatJson(systemPrompt, userMessage, { maxTokens: 1500 });
  const clips = normalizeClips(data?.clips, segments, cfg);

  if (!clips.length) {
    throw new Error('A IA nao retornou nenhum recorte valido');
  }

  // Remove sugestoes anteriores ainda nao trabalhadas; mantem as aprovadas/publicadas.
  await VideoClip.destroy({ where: { youtubeVideoId, status: 'suggested' } });

  const created = await VideoClip.bulkCreate(
    clips.map((c, i) => ({
      youtubeVideoId,
      position: i,
      startSeconds: c.startSeconds,
      endSeconds: c.endSeconds,
      title: c.title,
      caption: c.caption,
      reason: c.reason,
      status: 'suggested',
    }))
  );

  console.log(`[clips] ${created.length} recorte(s) sugerido(s) para ${video.videoId} via ${provider} (${model})`);
  return { clips: created, provider, model };
}

async function listClips(youtubeVideoId) {
  return VideoClip.findAll({
    where: { youtubeVideoId, status: { [Op.ne]: 'discarded' } },
    order: [['position', 'ASC'], ['startSeconds', 'ASC']],
  });
}

// Status que ja estao em andamento/finalizados e nao permitem edicao de tempo.
const LOCKED_STATUSES = ['rendering', 'publishing', 'published'];

/**
 * Edita um recorte antes da aprovacao: ajusta tempo (um pouco antes/depois),
 * titulo e legenda. Se o tempo mudar e ja havia um arquivo renderizado, ele
 * fica obsoleto e o recorte volta para aprovacao/re-render.
 */
async function updateClip(clipId, patch = {}) {
  const clip = await VideoClip.findByPk(clipId, {
    include: [{ model: YoutubeVideo, as: 'video', attributes: ['id', 'durationSeconds'] }],
  });
  if (!clip) throw new Error('Recorte nao encontrado');
  if (LOCKED_STATUSES.includes(clip.status)) {
    throw new Error(`Recorte com status "${clip.status}" nao pode ser editado`);
  }

  const updates = {};
  const timeChanged = patch.startSeconds !== undefined || patch.endSeconds !== undefined;

  if (timeChanged) {
    let start = patch.startSeconds !== undefined ? Number(patch.startSeconds) : Number(clip.startSeconds);
    let end = patch.endSeconds !== undefined ? Number(patch.endSeconds) : Number(clip.endSeconds);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error('startSeconds/endSeconds invalidos');
    }
    if (start < 0) start = 0;
    const maxDur = clip.video?.durationSeconds ? Number(clip.video.durationSeconds) : null;
    if (maxDur && end > maxDur) end = maxDur;
    if (end <= start) throw new Error('endSeconds deve ser maior que startSeconds');

    updates.startSeconds = Number(start.toFixed(3));
    updates.endSeconds = Number(end.toFixed(3));

    // Render anterior fica obsoleto quando o tempo muda.
    if (clip.filePath) {
      updates.filePath = null;
      updates.fileSizeBytes = null;
    }
    if (clip.status === 'rendered' || clip.status === 'failed') {
      updates.status = 'approved';
    }
  }

  if (patch.title !== undefined) {
    updates.title = patch.title === null ? null : String(patch.title).trim().slice(0, 200);
  }
  if (patch.caption !== undefined) {
    updates.caption = patch.caption === null ? null : String(patch.caption).trim();
  }

  await clip.update(updates);
  return clip;
}

async function setClipStatus(clipId, status) {
  const clip = await VideoClip.findByPk(clipId);
  if (!clip) throw new Error('Recorte nao encontrado');
  if (LOCKED_STATUSES.includes(clip.status)) {
    throw new Error(`Recorte com status "${clip.status}" nao pode ser alterado`);
  }
  await clip.update({ status });
  return clip;
}

function approveClip(clipId) {
  return setClipStatus(clipId, 'approved');
}

function discardClip(clipId) {
  return setClipStatus(clipId, 'discarded');
}

module.exports = {
  suggestClips,
  listClips,
  updateClip,
  approveClip,
  discardClip,
};
