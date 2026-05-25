/**
 * Comparacao fuzzy de nomes brasileiros para sugerir matches entre
 * texto livre (ex: "Pr. João Silva") e nomes em base de membros.
 *
 * Score 0..1. Combina jaccard de tokens com bonus de primeiro nome e
 * substring containment.
 */

const TITLE_PREFIXES = /\b(pr|pra|pastor|pastora|past|missionario|missionaria|missionario|ev|evangelista|presb|presbitero|diac|diacono|diacona|bp|bispo|apostolo|apostola)\.?\s+/g;

function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeName(s) {
  return stripAccents(s)
    .toLowerCase()
    .replace(TITLE_PREFIXES, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(s) {
  return normalizeName(s).split(' ').filter((t) => t.length >= 2);
}

function firstName(s) {
  const tokens = nameTokens(s);
  return tokens[0] || '';
}

/**
 * Compara dois nomes considerando APENAS o primeiro nome (apos limpar titulos).
 *  - 1.0  se primeiros nomes sao iguais (apos normalizar e remover acentos)
 *  - 0.6  se um e prefixo do outro (ex: "Jo" matcha "Joao") e tem >=3 letras
 *  - 0    caso contrario
 */
function firstNameSimilarity(a, b) {
  const fa = firstName(a);
  const fb = firstName(b);
  if (!fa || !fb) return 0;
  if (fa === fb) return 1;
  if (fa.length >= 3 && fb.startsWith(fa)) return 0.6;
  if (fb.length >= 3 && fa.startsWith(fb)) return 0.6;
  return 0;
}

/**
 * Para uma string de busca e candidatos {id, fullName},
 * retorna candidatos cujo PRIMEIRO NOME bate, ordenados por score desc
 * e (em empate) por fullName asc.
 */
function topMatches(query, candidates, { limit = 10, minScore = 0.6 } = {}) {
  if (!query) return [];
  const scored = candidates
    .map((c) => ({ ...c, score: firstNameSimilarity(query, c.fullName) }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.fullName || '').localeCompare(String(b.fullName || ''), 'pt-BR', { sensitivity: 'base' });
    })
    .slice(0, limit);
  return scored;
}

module.exports = {
  normalizeName,
  nameTokens,
  firstName,
  firstNameSimilarity,
  topMatches
};
