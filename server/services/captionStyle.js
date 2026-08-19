// Vocabulario compartilhado do estilo de legenda (Fase 1 de design de legenda).
// Puro (sem I/O): usado pelo captionStyleService (gera o plano via IA) e pelo
// clipRenderService (consome o plano ao montar o ASS). Manter os dois lados
// falando o MESMO dialeto (animacoes, normalizacao de palavra, cor) evita que
// uma palavra-chave "não case" na hora de destacar.

// Animacoes de ENTRADA suportadas. So estas — todas seguras (nao dependem de
// posicionamento absoluto, entao nunca jogam a legenda pra fora do lugar).
//   pop    -> entra menor (82%) e cresce ate 100% (padrao atual)
//   punch  -> entra maior (115%) e assenta em 100% (impacto)
//   fade   -> so aparece/some suave, sem escala
//   none   -> troca seca
const ANIMATIONS = ['pop', 'punch', 'fade', 'none'];

// Modo de exibicao da legenda:
//   phrase -> frase inteira por vez (ate 2 linhas) — PADRAO/comportamento atual
//   word   -> palavra por palavra APARECENDO e acumulando numa unica linha
//             (as palavras-chave aparecem maiores + coloridas)
const CAPTION_MODES = ['phrase', 'word'];

// Normaliza uma palavra para comparacao/destaque: MAIUSCULA e sem pontuacao,
// mantendo acentos do portugues. A legenda queimada tambem e MAIUSCULA e sem
// pontuacao (ver toCaption), entao as palavras-chave casam por igualdade.
function normalizeWord(w) {
  return String(w == null ? '' : w)
    .toUpperCase()
    .replace(/[^0-9A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ]/gi, '');
}

// Palavras vazias (artigos/preposicoes/conectivos) que nunca merecem destaque —
// evita marcar "DE"/"QUE" e deixa passar curtas fortes como "FÉ"/"PAZ"/"DEUS".
const STOPWORDS = new Set([
  'DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'O', 'A', 'OS', 'AS', 'UM', 'UMA', 'UNS', 'UMAS',
  'QUE', 'COM', 'SEM', 'POR', 'PARA', 'PRA', 'PRO', 'NO', 'NA', 'NOS', 'NAS', 'EM',
  'AO', 'AOS', 'À', 'ÀS', 'SE', 'OU', 'MAS', 'ME', 'TE', 'LHE', 'MEU', 'SEU', 'ISSO',
  'ISTO', 'ESSE', 'ESSA', 'ESTE', 'ESTA', 'ELE', 'ELA', 'FOI', 'ERA', 'NÃO', 'SIM',
]);

function isHexColor(s) {
  return /^#?[0-9a-fA-F]{6}$/.test(String(s || '').trim());
}

function normalizeHex(s) {
  const raw = String(s || '').trim().replace(/^#/, '');
  return `#${raw.toUpperCase()}`;
}

// Converte "#RRGGBB" para a cor do ASS "&HAABBGGRR" (alpha 00 = opaco, ordem BGR).
function hexToAssColor(hex, fallback = '&H00FFFFFF') {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || '').trim());
  if (!m) return fallback;
  const h = m[1];
  const r = h.slice(0, 2);
  const g = h.slice(2, 4);
  const b = h.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

/**
 * Valida/normaliza um plano de estilo cru (vindo da IA ou do admin) num objeto
 * seguro para persistir. Descarta campos invalidos silenciosamente (fallback no
 * render). Se `corpus` (Set de palavras normalizadas do trecho) for passado, so
 * mantem palavras-chave que REALMENTE aparecem na fala — evita destacar palavra
 * que a IA inventou e que nunca vai casar na legenda.
 * Retorna o plano normalizado ou null se nada aproveitavel.
 */
function sanitizePlan(raw, { corpus } = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const plan = {};

  if (typeof raw.theme === 'string' && raw.theme.trim()) {
    plan.theme = raw.theme.trim().slice(0, 40);
  }
  if (typeof raw.font === 'string' && raw.font.trim()) {
    plan.font = raw.font.trim().slice(0, 60);
  }
  if (isHexColor(raw.primaryColor)) plan.primaryColor = normalizeHex(raw.primaryColor);
  if (isHexColor(raw.highlightColor)) plan.highlightColor = normalizeHex(raw.highlightColor);
  if (ANIMATIONS.includes(raw.animation)) plan.animation = raw.animation;
  if (CAPTION_MODES.includes(raw.mode)) plan.mode = raw.mode;

  let keywords = Array.isArray(raw.keywords) ? raw.keywords : [];
  keywords = [...new Set(keywords.map(normalizeWord).filter((k) => k.length >= 2 && !STOPWORDS.has(k)))];
  if (corpus instanceof Set) keywords = keywords.filter((k) => corpus.has(k));
  keywords = keywords.slice(0, 12);
  if (keywords.length) plan.keywords = keywords;

  return Object.keys(plan).length ? plan : null;
}

module.exports = {
  ANIMATIONS,
  CAPTION_MODES,
  normalizeWord,
  isHexColor,
  normalizeHex,
  hexToAssColor,
  sanitizePlan,
};
