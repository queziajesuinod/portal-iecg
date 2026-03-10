const { User } = require('../models');
const { buildPermissionInclude, extractPermissionNames } = require('../services/permissionResolver');

function normalizePermissionList(requiredPermissions) {
  if (!requiredPermissions) {
    return [];
  }
  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.filter(Boolean);
  }
  return [requiredPermissions];
}

function requirePermission(requiredPermissions) {
  const permissionsToCheck = normalizePermissionList(requiredPermissions);

  return async (req, res, next) => {
    if (!permissionsToCheck.length) {
      return next();
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Acesso negado. Token inválido.' });
    }

    const usuario = await User.findByPk(userId, {
      include: buildPermissionInclude()
    });

    if (!usuario) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    const permissoes = extractPermissionNames(usuario);
    if (permissoes.includes('ADMIN_FULL_ACCESS')) {
      return next();
    }

    const hasPermission = permissionsToCheck.some((permission) => permissoes.includes(permission));
    if (!hasPermission) {
      return res.status(403).json({
        message: `Permissão necessária: ${permissionsToCheck.join(', ')}`
      });
    }

    return next();
  };
}

module.exports = requirePermission;
