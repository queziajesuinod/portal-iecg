const { YoutubeVideo, VideoTranscript, VideoClip } = require('../models');
const llmChain = require('./llmChainService');
const { ANIMATIONS, normalizeWord, sanitizePlan } = require('./captionStyle');

// Diretor de arte da legenda (Fase 1): a partir da fala do recorte, a IA sugere
// um plano de estilo (tema, cores, animacao de entrada e palavras-chave a
// destacar). Quem DESENHA a legenda continua sendo o ffmpeg/ASS (clipRenderService);
// aqui so decidimos o "figurino". Reaproveita a cadeia de provedores do llmChainService.

// Status que ja estao em andamento/finalizados e nao aceitam troca de estilo.
const LOCKED_STATUSES = ['rendering', 'publishing', 'published'];

function buildSystemPrompt() {
  return `Você é um diretor de arte de legendas para YouTube Shorts / Reels / TikTok de conteúdo cristão (pregações e estudos).

Você recebe a FALA de um recorte curto (já em MAIÚSCULAS, sem pontuação — é assim que a legenda é queimada no vídeo). Sua tarefa é propor um "figurino" para essa legenda que aumente o impacto SEM poluir: fonte, cores, animação de entrada e quais palavras destacar.

DIRETRIZES:
- Escolha um "theme" curto (1-2 palavras) que resuma o tom (ex.: "exortação", "consolo", "alegria", "reverência").
- "highlightColor": cor VIVA (hex #RRGGBB) para as palavras-chave, com bom contraste sobre vídeo (dourado, âmbar, ciano, coral). Evite cores escuras.
- "primaryColor": cor do texto normal — quase sempre branco (#FFFFFF). Só mude se fizer sentido.
- "animation": UMA de ${ANIMATIONS.map((a) => `"${a}"`).join(', ')} (pop = cresce ao entrar; punch = impacto; fade = suave; none = seca).
- "keywords": de 2 a 8 palavras FORTES que já aparecem na fala (copie-as exatamente), as que merecem destaque visual. Nada de artigos/preposições. Nunca invente palavras que não estão na fala.
- Contenção: melhor destacar poucas palavras certas do que muitas.

FORMATO: responda APENAS com um objeto JSON válido, sem markdown:
{ "theme": "...", "primaryColor": "#FFFFFF", "highlightColor": "#FFD24A", "animation": "pop", "keywords": ["PALAVRA1","PALAVRA2"] }`;
}

function buildUserMessage(title, captionText) {
  return `Título do recorte: ${title || '(sem título)'}\n\nFALA DO RECORTE (legenda):\n${captionText}`;
}

// Junta o texto dos segmentos que caem dentro do recorte (mesma janela do buildAss,
// de forma simplificada) e devolve { text, corpus } — corpus = Set de palavras
// normalizadas, usado para filtrar palavras-chave alucinadas.
function collectCaptionCorpus(segments, start, end) {
  const parts = [];
  for (const seg of segments || []) {
    const segStart = Number(seg.start);
    const segEnd = Number(seg.end);
    if (!(segEnd > start && segStart < end)) continue;
    if (seg.text) parts.push(String(seg.text).trim());
  }
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  const corpus = new Set(text.split(/\s+/).map(normalizeWord).filter(Boolean));
  return { text, corpus };
}

// Persiste o plano no recorte. Como o visual muda, um render anterior fica obsoleto:
// zera o arquivo e volta rendered/failed -> approved (para re-renderizar).
async function applyStylePlan(clip, plan) {
  const updates = { stylePlan: plan || null };
  if (clip.filePath) {
    updates.filePath = null;
    updates.fileSizeBytes = null;
  }
  if (clip.status === 'rendered' || clip.status === 'failed') {
    updates.status = 'approved';
  }
  await clip.update(updates);
  return clip;
}

/**
 * Gera (via IA) e persiste um plano de estilo para a legenda do recorte.
 * Retorna { clip, plan, provider, model }.
 */
async function suggestStylePlan(clipId) {
  const clip = await VideoClip.findByPk(clipId, {
    include: [{ model: YoutubeVideo, as: 'video' }],
  });
  if (!clip) throw new Error('Recorte nao encontrado');
  if (LOCKED_STATUSES.includes(clip.status)) {
    throw new Error(`Recorte com status "${clip.status}" nao aceita troca de estilo`);
  }

  const transcript = await VideoTranscript.findOne({ where: { youtubeVideoId: clip.video.id } });
  const { text, corpus } = collectCaptionCorpus(transcript?.segments, Number(clip.startSeconds), Number(clip.endSeconds));
  if (!text) {
    throw new Error('Recorte sem fala transcrita neste intervalo — nao da para sugerir estilo.');
  }

  const { data, provider, model } = await llmChain.chatJson(
    buildSystemPrompt(),
    buildUserMessage(clip.title, text.toUpperCase()),
    { maxTokens: 600 }
  );

  const plan = sanitizePlan(data, { corpus });
  if (!plan) {
    throw new Error('A IA nao retornou um plano de estilo valido. Tente novamente.');
  }

  await applyStylePlan(clip, plan);
  console.log(`[captionStyle] clip ${clip.id}: tema="${plan.theme || '-'}" cor=${plan.highlightColor || '-'} anim=${plan.animation || '-'} kw=${(plan.keywords || []).length} via ${provider} (${model})`);
  return {
    clip, plan, provider, model
  };
}

/**
 * Define/limpa o plano de estilo manualmente (ajuste do admin).
 * `raw` = objeto de plano (validado) ou null/{} para voltar ao estilo padrao.
 */
async function setStylePlan(clipId, raw) {
  const clip = await VideoClip.findByPk(clipId);
  if (!clip) throw new Error('Recorte nao encontrado');
  if (LOCKED_STATUSES.includes(clip.status)) {
    throw new Error(`Recorte com status "${clip.status}" nao aceita troca de estilo`);
  }
  // Ajuste manual: nao filtra por corpus (o admin pode destacar o que quiser).
  const plan = raw == null ? null : sanitizePlan(raw);
  await applyStylePlan(clip, plan);
  return clip;
}

module.exports = {
  suggestStylePlan,
  setStylePlan,
};
