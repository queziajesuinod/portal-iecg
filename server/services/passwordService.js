const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const BCRYPT_ROUNDS = 10;

// Detecta um hash bcrypt ($2a$/$2b$/$2y$). Hashes legados são SHA-256+salt (hex de 64 chars).
function isBcryptHash(hash) {
  return typeof hash === 'string' && /^\$2[aby]\$/.test(hash);
}

// Algoritmo legado (mantido apenas para verificar senhas antigas ainda não migradas).
function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Gera hash bcrypt para uma nova senha (padrão atual).
async function hashPassword(plain) {
  return bcrypt.hash(String(plain), BCRYPT_ROUNDS);
}

// Verifica a senha contra o hash armazenado, suportando tanto bcrypt quanto o legado
// SHA-256+salt. Comparação do legado em tempo constante para evitar timing attacks.
async function verifyPassword(plain, { passwordHash, salt } = {}) {
  if (!plain || !passwordHash) return false;
  if (isBcryptHash(passwordHash)) {
    return bcrypt.compare(String(plain), passwordHash);
  }
  if (!salt) return false;
  const computed = hashSHA256WithSalt(String(plain), salt);
  const a = Buffer.from(computed);
  const b = Buffer.from(passwordHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// True quando o hash ainda está no formato legado e deve ser re-hasheado para bcrypt.
function needsRehash(passwordHash) {
  return Boolean(passwordHash) && !isBcryptHash(passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
  needsRehash,
  isBcryptHash,
  hashSHA256WithSalt,
  BCRYPT_ROUNDS
};
