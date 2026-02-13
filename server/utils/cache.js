/**
 * Módulo de Cache com Redis
 * 
 * Sistema de cache em memória usando Redis para melhorar performance
 * das queries mais utilizadas no sistema de eventos.
 * 
 * Ganho estimado: 10-13 segundos (80-100%) para requisições em cache
 */

const redis = require('redis');

// Verificar se Redis está configurado
const REDIS_ENABLED = !!process.env.REDIS_URL;

if (!REDIS_ENABLED) {
  console.warn('⚠️  REDIS_URL não configurado. Sistema funcionará sem cache.');
  console.warn('⚠️  Para melhor performance, configure REDIS_URL no arquivo .env');
}

// Configuração do cliente Redis (apenas se REDIS_URL estiver configurado)
let redisClient = null;

if (REDIS_ENABLED) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('❌ Redis: Máximo de tentativas de reconexão atingido');
          return new Error('Redis: Falha ao reconectar');
        }
        // Exponential backoff: 100ms, 200ms, 400ms, 800ms...
        return Math.min(retries * 100, 3000);
      },
    },
  });
}

// Flags de controle
let isConnected = false;
let isConnecting = false;

// Conectar ao Redis
async function connect() {
  if (!REDIS_ENABLED) {
    console.log('ℹ️  Redis desabilitado. Sistema funcionando sem cache.');
    return;
  }

  if (isConnected || isConnecting) {
    return;
  }

  isConnecting = true;

  try {
    await redisClient.connect();
    isConnected = true;
    isConnecting = false;
    console.log('✅ Redis conectado com sucesso');
  } catch (error) {
    isConnecting = false;
    console.error('❌ Erro ao conectar ao Redis:', error.message);
    console.warn('⚠️  Sistema continuará funcionando sem cache');
  }
}

// Event listeners (apenas se Redis estiver habilitado)
if (REDIS_ENABLED && redisClient) {
  redisClient.on('error', (err) => {
    console.error('❌ Redis Error:', err.message);
    isConnected = false;
  });

  redisClient.on('reconnecting', () => {
    console.log('🔄 Redis: Tentando reconectar...');
    isConnected = false;
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis: Pronto para uso');
    isConnected = true;
  });
}

// TTL padrão: 5 minutos
const DEFAULT_TTL = 5 * 60; // segundos

/**
 * Buscar valor do cache
 * @param {string} key - Chave do cache
 * @returns {Promise<any|null>} - Valor do cache ou null se não encontrado
 */
async function get(key) {
  if (!REDIS_ENABLED || !isConnected) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      console.log(`[CACHE HIT] ${key}`);
      return JSON.parse(value);
    }
    console.log(`[CACHE MISS] ${key}`);
    return null;
  } catch (error) {
    console.error(`[CACHE ERROR] Erro ao buscar ${key}:`, error.message);
    return null;
  }
}

/**
 * Salvar valor no cache
 * @param {string} key - Chave do cache
 * @param {any} value - Valor a ser armazenado
 * @param {number} ttl - Tempo de vida em segundos (padrão: 5 minutos)
 * @returns {Promise<boolean>} - true se salvou com sucesso
 */
async function set(key, value, ttl = DEFAULT_TTL) {
  if (!REDIS_ENABLED || !isConnected) {
    return false;
  }

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    console.log(`[CACHE SET] ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`[CACHE ERROR] Erro ao salvar ${key}:`, error.message);
    return false;
  }
}

/**
 * Deletar valor do cache
 * @param {string} key - Chave do cache
 * @returns {Promise<boolean>} - true se deletou com sucesso
 */
async function del(key) {
  if (!REDIS_ENABLED || !isConnected) {
    return false;
  }

  try {
    await redisClient.del(key);
    console.log(`[CACHE DEL] ${key}`);
    return true;
  } catch (error) {
    console.error(`[CACHE ERROR] Erro ao deletar ${key}:`, error.message);
    return false;
  }
}

/**
 * Deletar múltiplas chaves por padrão
 * @param {string} pattern - Padrão de chaves (ex: 'event:*')
 * @returns {Promise<number>} - Número de chaves deletadas
 */
async function delPattern(pattern) {
  if (!REDIS_ENABLED || !isConnected) {
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }

    await redisClient.del(keys);
    console.log(`[CACHE DEL PATTERN] ${pattern} (${keys.length} chaves)`);
    return keys.length;
  } catch (error) {
    console.error(`[CACHE ERROR] Erro ao deletar padrão ${pattern}:`, error.message);
    return 0;
  }
}

/**
 * Limpar todo o cache
 * @returns {Promise<boolean>} - true se limpou com sucesso
 */
async function flush() {
  if (!REDIS_ENABLED || !isConnected) {
    return false;
  }

  try {
    await redisClient.flushDb();
    console.log('[CACHE FLUSH] Cache limpo completamente');
    return true;
  } catch (error) {
    console.error('[CACHE ERROR] Erro ao limpar cache:', error.message);
    return false;
  }
}

/**
 * Wrapper para executar função com cache
 * @param {string} key - Chave do cache
 * @param {Function} fn - Função a ser executada se não houver cache
 * @param {number} ttl - Tempo de vida em segundos
 * @returns {Promise<any>} - Resultado da função ou do cache
 */
async function getOrSet(key, fn, ttl = DEFAULT_TTL) {
  // Tentar buscar do cache
  const cached = await get(key);
  if (cached !== null) {
    return cached;
  }

  // Se não tem cache, executar função
  const result = await fn();

  // Salvar no cache
  await set(key, result, ttl);

  return result;
}

/**
 * Verificar se o Redis está conectado
 * @returns {boolean}
 */
function isReady() {
  return isConnected;
}

/**
 * Desconectar do Redis
 */
async function disconnect() {
  if (REDIS_ENABLED && isConnected && redisClient) {
    await redisClient.quit();
    isConnected = false;
    console.log('✅ Redis desconectado');
  }
}

// Chaves de cache padronizadas
const CACHE_KEYS = {
  event: (id) => `event:${id}`,
  eventBatches: (eventId) => `event:${eventId}:batches`,
  eventFormFields: (eventId) => `event:${eventId}:form-fields`,
  eventPaymentOptions: (eventId) => `event:${eventId}:payment-options`,
  eventPublic: (id) => `event:public:${id}`,
  eventsList: () => 'events:list',
  eventsPublicList: () => 'events:public:list',
  registration: (orderCode) => `registration:${orderCode}`,
};

module.exports = {
  connect,
  get,
  set,
  del,
  delPattern,
  flush,
  getOrSet,
  isReady,
  disconnect,
  CACHE_KEYS,
  DEFAULT_TTL,
};
