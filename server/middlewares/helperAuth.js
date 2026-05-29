function getValidTokens() {
  return String(process.env.HELPER_TOKENS || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function helperAuth(req, res, next) {
  const token = req.headers['x-helper-token'] || req.query.helperToken;
  if (!token) {
    return res.status(401).json({ message: 'X-Helper-Token ausente' });
  }
  const valid = getValidTokens();
  if (valid.length === 0) {
    return res.status(503).json({ message: 'HELPER_TOKENS nao configurado no servidor' });
  }
  if (!valid.includes(String(token))) {
    return res.status(403).json({ message: 'Token invalido' });
  }
  return next();
}

module.exports = helperAuth;
