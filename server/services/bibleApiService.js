const axios = require('axios');

// Cliente da API pública A Bíblia Digital (https://www.abibliadigital.com.br/)
// Requer um token Bearer gratuito (cadastro por email no site deles).
// Os versículos retornados aqui são SEMPRE texto real da Bíblia — nunca gerados por LLM.

const BASE_URL = 'https://www.abibliadigital.com.br/api';
const DEFAULT_VERSION = process.env.BIBLE_DEFAULT_VERSION || 'nvi';
const REQUEST_TIMEOUT = 15000;

// Cache simples em memória (a API tem limite de requisições e o conteúdo é imutável).
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 horas

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  cache.set(key, { value, at: Date.now() });
}

function getClient() {
  const token = process.env.BIBLE_API_TOKEN;
  const headers = { 'Content-Type': 'application/json' };
  // O token é opcional para algumas rotas, mas a busca exige autenticação.
  if (token) headers.Authorization = `Bearer ${token}`;
  return axios.create({ baseURL: BASE_URL, timeout: REQUEST_TIMEOUT, headers });
}

function normalizeVerse(raw, fallbackVersion) {
  if (!raw || typeof raw !== 'object') return null;
  const book = raw.book || {};
  const bookName = book.name || raw.bookName || '';
  const bookAbbrev = (book.abbrev && (book.abbrev.pt || book.abbrev)) || raw.abbrev || '';
  const chapter = raw.chapter ?? raw.number?.chapter ?? null;
  const number = raw.number ?? raw.verse ?? null;
  const text = (raw.text || '').trim();
  if (!text || chapter == null || number == null) return null;
  const version = (raw.version || fallbackVersion || DEFAULT_VERSION).toLowerCase();
  return {
    reference: `${bookName} ${chapter}:${number}`,
    book: bookName,
    abbrev: bookAbbrev,
    chapter,
    number,
    text,
    version,
  };
}

/**
 * Lista as versões disponíveis na API.
 */
async function listVersions() {
  const cacheKey = 'versions';
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const { data } = await getClient().get('/versions');
  const versions = Array.isArray(data)
    ? data.map((v) => ({ version: v.version, verses: v.verses }))
    : [];
  setCached(cacheKey, versions);
  return versions;
}

/**
 * Busca versículos reais por palavra/expressão.
 * @returns {Promise<Array>} versículos normalizados (texto real da Bíblia)
 */
async function searchVerses(term, version = DEFAULT_VERSION) {
  const cleanTerm = String(term || '').trim();
  if (!cleanTerm) return [];
  const ver = String(version || DEFAULT_VERSION).toLowerCase();
  const cacheKey = `search:${ver}:${cleanTerm.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await getClient().post('/verses/search', {
      version: ver,
      search: cleanTerm,
    });
    const list = Array.isArray(data?.verses) ? data.verses : [];
    const verses = list
      .map((v) => normalizeVerse({ ...v, version: ver }, ver))
      .filter(Boolean);
    setCached(cacheKey, verses);
    return verses;
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error('BIBLE_API_TOKEN ausente ou inválido. Gere um token gratuito em abibliadigital.com.br.');
    }
    // Sem resultado / termo não encontrado não é erro fatal.
    if (err.response?.status === 404) return [];
    throw new Error(`Falha na busca da API da Bíblia: ${err.message}`);
  }
}

/**
 * Busca um versículo específico (referência exata).
 */
async function getVerse(book, chapter, number, version = DEFAULT_VERSION) {
  const ver = String(version || DEFAULT_VERSION).toLowerCase();
  const cacheKey = `verse:${ver}:${book}:${chapter}:${number}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const { data } = await getClient().get(`/verses/${ver}/${book}/${chapter}/${number}`);
  const verse = normalizeVerse({ ...data, version: ver }, ver);
  if (verse) setCached(cacheKey, verse);
  return verse;
}

module.exports = {
  listVersions,
  searchVerses,
  getVerse,
  DEFAULT_VERSION,
};
