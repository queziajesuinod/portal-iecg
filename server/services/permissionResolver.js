const { User, Perfil, Permissao } = require('../models');

function buildPermissionInclude() {
  const permissoesInclude = { model: Permissao, as: 'permissoes', through: { attributes: [] } };
  return [
    // Perfil primário (via perfilId FK)
    { model: Perfil, required: false, include: [permissoesInclude] },
    // Perfis adicionais (via UserPerfis many-to-many)
    {
      model: Perfil,
      as: 'perfis',
      through: { attributes: [] },
      required: false,
      include: [permissoesInclude]
    },
    // Permissões diretas ao usuário
    {
      model: Permissao, as: 'permissoesDiretas', through: { attributes: [] }, required: false
    }
  ];
}

function extractPermissionNames(user) {
  if (!user) return [];
  const perfilPerms = user.Perfil?.permissoes || [];
  const perfisPerms = (user.perfis || []).flatMap(p => p.permissoes || []);
  const directPerms = user.permissoesDiretas || [];
  return Array.from(new Set(
    [...perfilPerms, ...perfisPerms, ...directPerms]
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
