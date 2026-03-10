const { User, Perfil, Permissao } = require('../models');

function buildPermissionInclude() {
  return [
    {
      model: Perfil,
      required: false,
      include: [{
        model: Permissao,
        as: 'permissoes',
        through: { attributes: [] }
      }]
    },
    {
      model: Permissao,
      as: 'permissoesDiretas',
      through: { attributes: [] },
      required: false
    }
  ];
}

function extractPermissionNames(user) {
  if (!user) return [];
  const perfilPerms = user.Perfil?.permissoes || [];
  const directPerms = user.permissoesDiretas || [];
  return Array.from(new Set(
    [...perfilPerms, ...directPerms]
      .map((perm) => perm?.nome)
      .filter(Boolean)
  ));
}

async function getUserPermissionNames(userId) {
  if (!userId) return [];
  const user = await User.findByPk(userId, {
    include: buildPermissionInclude()
  });
  return extractPermissionNames(user);
}

async function hasUserPermission(userId, permissions = []) {
  const requiredPermissions = Array.isArray(permissions) ? permissions.filter(Boolean) : [permissions].filter(Boolean);
  if (!requiredPermissions.length) return true;
  const userPermissions = await getUserPermissionNames(userId);
  if (userPermissions.includes('ADMIN_FULL_ACCESS')) return true;
  return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

module.exports = {
  buildPermissionInclude,
  extractPermissionNames,
  getUserPermissionNames,
  hasUserPermission
};
