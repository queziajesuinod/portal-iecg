const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = decoded;
    next(); // Continua para a próxima função na pilha
  } catch (err) {
    res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
};
