const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

const EMBED_PORT = process.env.EMBEDDING_PORT || 7432;
const EMBED_URL = `http://127.0.0.1:${EMBED_PORT}`;
const SCRIPT = path.join(__dirname, 'embedding_server.py');
const ENABLED = process.env.EMBEDDING_ENABLED === 'true';

// Limiar mínimo de similaridade para considerar um versículo relevante.
// 0.40 é conservador: rejeita associações superficiais e mantém relevância semântica real.
const SIMILARITY_THRESHOLD = parseFloat(process.env.EMBEDDING_THRESHOLD || '0.42');

let serverProcess = null;
let startPromise = null;
let ready = false;

function startServer() {
  if (!ENABLED) {
    console.log('[embedding] Desativado. Defina EMBEDDING_ENABLED=true para iniciar o servidor Python.');
    return Promise.resolve();
  }
  if (startPromise) return startPromise;

  startPromise = new Promise((resolve, reject) => {
    const python = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    serverProcess = spawn(python, [SCRIPT, String(EMBED_PORT)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (data) => {
      const line = data.toString().trim();
      if (line) process.stdout.write(`[embedding] ${line}\n`);
      if (line.includes('Ouvindo na porta')) {
        ready = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) process.stderr.write(`[embedding] ${line}\n`);
    });

    serverProcess.on('error', (err) => {
      startPromise = null;
      reject(new Error(`Falha ao iniciar embedding_server.py: ${err.message}`));
    });

    serverProcess.on('exit', (code) => {
      ready = false;
      startPromise = null;
      serverProcess = null;
      if (code !== 0 && code !== null) {
        process.stderr.write(`[embedding] processo encerrado com código ${code}\n`);
      }
    });

    // Timeout de 60s para o modelo carregar
    setTimeout(() => {
      if (!ready) reject(new Error('Timeout ao carregar modelo de embeddings (60s).'));
    }, 60000);
  });

  return startPromise;
}

async function ensureReady() {
  if (ready) return;
  await startServer();
  // Aguarda o servidor HTTP aceitar conexões
  for (let i = 0; i < 30; i += 1) {
    try {
      await axios.get(`${EMBED_URL}/health`, { timeout: 2000 });
      return;
    } catch {
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Servidor de embeddings não respondeu após 30 tentativas.');
}

/**
 * Filtra versículos por similaridade semântica com os contextos fornecidos.
 * Retorna apenas os versículos que superam o limiar de similaridade,
 * junto com o score de cada um, em ordem decrescente de relevância.
 *
 * @param {string[]} contexts - Lista de contextos/temas de busca
 * @param {Array} verses - Versículos com campo .text
 * @param {number} [threshold] - Limiar de similaridade (0-1), padrão do .env
 * @returns {Promise<Array>} versículos filtrados com campo .score adicionado
 */
async function filterBySimilarity(contexts, verses, threshold = SIMILARITY_THRESHOLD) {
  if (!contexts.length || !verses.length) return [];

  // Quando desativado, retorna todos os candidatos sem filtro semântico
  if (!ENABLED) {
    return verses.map((v) => ({ ...v, score: 1 }));
  }

  try {
    await ensureReady();
  } catch (err) {
    console.warn(`[embedding] Busca sem filtro semantico: ${err.message}`);
    return verses.map((v) => ({ ...v, score: 1 }));
  }

  const texts = verses.map((v) => v.text);

  const { data } = await axios.post(
    `${EMBED_URL}/similarity`,
    { contexts, texts },
    { timeout: 30000 }
  );

  const scores = data.scores || [];

  return verses
    .map((v, i) => ({ ...v, score: scores[i] ?? 0 }))
    .filter((v) => v.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

process.on('exit', () => {
  if (serverProcess) serverProcess.kill();
});

module.exports = { filterBySimilarity, startServer };
