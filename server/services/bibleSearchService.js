const bibleApi = require('./bibleApiService');
const embedding = require('./embeddingService');
const llm = require('./llmProviderService');

// Ordem canônica dos livros da Bíblia para ordenação cronológica
const BIBLE_BOOK_ORDER = [
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio',
  'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel',
  '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras',
  'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios',
  'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias', 'Lamentações',
  'Ezequiel', 'Daniel', 'Oséias', 'Joel', 'Amós',
  'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque',
  'Sofonias', 'Ageu', 'Zacarias', 'Malaquias',
  'Mateus', 'Marcos', 'Lucas', 'João', 'Atos',
  'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios',
  'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses',
  '1 Timóteo', '2 Timóteo', 'Tito', 'Filêmon', 'Hebreus',
  'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas', 'Apocalipse',
];

const TERMS_SYSTEM_PROMPT = `Você é um pesquisador bíblico especializado em teologia e exegese. Sua tarefa é gerar palavras-chave temáticas para localizar versículos bíblicos relevantes.

REGRAS CRÍTICAS:
- Gere apenas SUBSTANTIVOS e ADJETIVOS que aparecem no texto de versículos bíblicos.
- NUNCA gere: verbos auxiliares (tenha, seja, faça, tenham), pronomes, artigos, preposições, negações ("não"), advérbios vagos (muito, todo, cada).
- Gere variações morfológicas úteis: "medo" → "temor", "medroso", "pavor", "ansioso".
- Se houver TEXTO DE CONTEXTO ADICIONAL, use-o para entender o tema em profundidade e gerar termos mais precisos — mas os termos finais devem ser palavras que aparecem no texto bíblico.
- Se houver TEMAS A EXCLUIR, não gere nenhum termo ligado a esses assuntos.
- Máximo 10 palavras-chave no total.
- Responda APENAS em JSON: {"terms": ["palavra1", "palavra2", ...]}`;

// Verbos funcionais e palavras gramaticais que não representam temas bíblicos
const FUNCTIONAL_WORDS = new Set([
  'não', 'tenha', 'seja', 'faça', 'tenham', 'sejam', 'façam', 'haja', 'todo', 'toda',
  'cada', 'mais', 'menos', 'muito', 'pouco', 'bem', 'mal', 'como', 'quando', 'onde',
  'quem', 'qual', 'qualquer', 'alguns', 'algumas', 'nenhum', 'nenhuma', 'outro', 'outra',
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'o', 'a', 'os', 'as',
  'e', 'ou', 'que', 'para', 'com', 'um', 'uma', 'uns', 'umas', 'por', 'ao', 'aos', 'às',
  'se', 'é', 'são', 'foi', 'ser', 'ter', 'estar', 'ir', 'vir', 'ver', 'dar', 'pôr',
  'me', 'te', 'lhe', 'nos', 'vos', 'lhes', 'meu', 'minha', 'teu', 'tua', 'seu', 'sua',
  'este', 'esta', 'esse', 'essa', 'isso', 'aquele', 'aquela', 'aquilo', 'aqui', 'lá',
  'já', 'só', 'nem', 'ainda', 'então', 'assim', 'também', 'mas', 'porém', 'contudo',
  // Formas verbais comuns que não são temáticas
  'tenhas', 'tenhais', 'tenhamos', 'tenham', 'tinhas', 'tinha', 'tínhamos', 'tinham',
  'sejas', 'seja', 'sejais', 'sejamos', 'eram', 'seria', 'seriam', 'foram', 'serão',
  'façais', 'façamos', 'faça', 'fizesse', 'fizessem', 'fizer', 'fizerem',
  'haja', 'hajas', 'hajais', 'hajamos', 'hajam',
]);

function buildUserMessage(contexts, contextText, excludeTopics) {
  let msg = `CONTEXTOS DE BUSCA:\n${contexts.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  if (contextText && contextText.trim()) {
    // Limita a 2500 chars para não exceder o orçamento de tokens
    const snippet = contextText.trim().substring(0, 2500);
    const truncated = contextText.trim().length > 2500 ? '\n[...texto truncado]' : '';
    msg += `\n\nTEXTO DE CONTEXTO ADICIONAL (transcrição, anotações ou descrição detalhada do tema):\n${snippet}${truncated}`;
  }

  if (excludeTopics && excludeTopics.length > 0) {
    msg += `\n\nTEMAS A EXCLUIR (não gere termos ligados a esses assuntos):\n${excludeTopics.join(', ')}`;
  }

  return msg;
}

async function getSearchTermsFromLLM(contexts, { contextText = '', excludeTopics = [] } = {}) {
  const allTerms = new Set();
  const userMsg = buildUserMessage(contexts, contextText, excludeTopics);
  try {
    const result = await llm.chatJson(TERMS_SYSTEM_PROMPT, userMsg);
    const terms = Array.isArray(result?.terms) ? result.terms : [];
    terms
      .filter((t) => typeof t === 'string' && t.trim().length >= 3)
      .forEach((t) => allTerms.add(t.trim().toLowerCase()));
  } catch {
    // Fallback: extrai apenas palavras que não são funcionais dos contextos
    for (const ctx of contexts) {
      ctx.split(/\s+/)
        .map((w) => w.replace(/[^\wáàâãéèêíïóôõúüçñ]/gi, '').toLowerCase())
        .filter((w) => w.length >= 4 && !FUNCTIONAL_WORDS.has(w))
        .forEach((w) => allTerms.add(w));
    }
  }
  return [...allTerms];
}

function bookOrder(bookName) {
  if (!bookName) return 9999;
  const exact = BIBLE_BOOK_ORDER.indexOf(bookName);
  if (exact >= 0) return exact;
  const lower = bookName.toLowerCase();
  for (let i = 0; i < BIBLE_BOOK_ORDER.length; i += 1) {
    if (BIBLE_BOOK_ORDER[i].toLowerCase().startsWith(lower.substring(0, 4))) return i;
  }
  return 9999;
}

function sortByBibleOrder(verses) {
  return [...verses].sort((a, b) => {
    const ao = bookOrder(a.book);
    const bo = bookOrder(b.book);
    if (ao !== bo) return ao - bo;
    if (a.chapter !== b.chapter) return (a.chapter || 0) - (b.chapter || 0);
    return (a.number || 0) - (b.number || 0);
  });
}

function dedupeVerses(verses) {
  const seen = new Set();
  return verses.filter((v) => {
    const key = `${v.book}|${v.chapter}|${v.number}|${v.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Busca versículos semanticamente relevantes para contextos separados por vírgula.
 *
 * Fluxo:
 * 1. LLM interpreta os contextos e gera palavras-chave temáticas reais (substantivos/adjetivos)
 * 2. API da Bíblia é consultada com essas palavras-chave
 * 3. Embeddings filtram por similaridade semântica real com os contextos originais
 * 4. Resultado ordenado em ordem canônica bíblica
 */
// Limite de candidatos enviados ao servidor de embeddings por requisição.
// Cada versículo ocupa ~1-2 KB de texto; 800 candidatos = ~1-2 MB de payload JSON,
// seguro para o heap do Node. A busca em paralelo pode trazer muito mais — cortamos aqui.
const MAX_CANDIDATES = 800;

async function searchByContexts(query, {
  version = bibleApi.DEFAULT_VERSION, limit = 0, threshold, contextText = '', excludeTopics = []
} = {}) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) throw new Error('Informe ao menos um contexto de busca.');

  const contexts = cleanQuery.split(',').map((c) => c.trim()).filter(Boolean);
  if (contexts.length === 0) throw new Error('Nenhum contexto válido encontrado.');

  const searchTerms = await getSearchTermsFromLLM(contexts, { contextText, excludeTopics });
  if (searchTerms.length === 0) {
    return { contexts, verses: [], total: 0 };
  }

  // Busca os termos na API em paralelo, com concorrência limitada a 5 para não sobrecarregar
  const BATCH_SIZE = 5;
  const allVerses = [];
  for (let i = 0; i < searchTerms.length; i += BATCH_SIZE) {
    const slice = searchTerms.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(slice.map((term) => bibleApi.searchVerses(term, version).catch(() => [])));
    allVerses.push(...results.flat());
    // Para imediatamente se já temos candidatos suficientes
    if (allVerses.length >= MAX_CANDIDATES * 2) break;
  }

  const candidates = dedupeVerses(allVerses).slice(0, MAX_CANDIDATES);
  if (candidates.length === 0) {
    return { contexts, verses: [], total: 0 };
  }

  // Embeddings filtram por similaridade semântica com os contextos originais
  const relevant = await embedding.filterBySimilarity(contexts, candidates, threshold);

  const sorted = sortByBibleOrder(relevant);
  const verses = limit > 0 ? sorted.slice(0, limit) : sorted;

  return { contexts, verses, total: verses.length };
}

module.exports = { searchByContexts };
