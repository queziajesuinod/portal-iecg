const bibleApi = require('../services/bibleApiService');
const bibleSearch = require('../services/bibleSearchService');

async function listVersions(req, res) {
  try {
    const versions = await bibleApi.listVersions();
    return res.json({ versions, defaultVersion: bibleApi.DEFAULT_VERSION });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

// Busca versículos por contextos semânticos (palavras-chave separadas por vírgula).
// Varre a Bíblia real via API, filtra por relevância semântica e ordena em ordem canônica.
async function search(req, res) {
  const {
    query, version, limit, contextText, excludeTopics
  } = req.body || {};
  if (!query || !String(query).trim()) {
    return res.status(400).json({ erro: 'Informe contextos de busca separados por vírgula (campo "query").' });
  }
  try {
    const result = await bibleSearch.searchByContexts(query, {
      version: version || bibleApi.DEFAULT_VERSION,
      limit: Number(limit) || 0,
      contextText: contextText || '',
      excludeTopics: Array.isArray(excludeTopics) ? excludeTopics : [],
    });
    return res.json({
      query: String(query).trim(),
      version: version || bibleApi.DEFAULT_VERSION,
      contexts: result.contexts,
      total: result.total,
      verses: result.verses,
    });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

module.exports = { listVersions, search };
