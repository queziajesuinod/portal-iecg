const { rateLimit } = require('express-rate-limit');

// Limiter para login: protege contra brute-force / credential stuffing
// (crítico enquanto contas de membro tiverem senha derivada do telefone).
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 10, // 10 tentativas por IP por janela
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }
});

// Limiter para endpoints públicos anônimos (formulários /public/*):
// evita enumeração em massa de dados de líderes/células por ID ou contato.
const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 100, // 100 requisições por IP por janela
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Tente novamente em alguns minutos.' }
});

module.exports = { loginRateLimiter, publicRateLimiter };
