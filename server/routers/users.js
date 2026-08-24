const { Router } = require('express');
const express = require('express');
const requirePermission = require('../middlewares/requirePermission');
const {
  getUsers,
  postUsers,
  getUserDetalhe,
  putUser,
  getUserComConjuge,
  postSyncUserMember,
  postSyncAllUserMembers,
  postSendPasswordReset
} = require('../controllers/users');

const { hasUserPermission } = require('../services/permissionResolver');

const router = Router();

router.use(express.json());

// Só admin de usuários (ou ADMIN_FULL_ACCESS) pode listar/criar/gerenciar terceiros.
const requireUsersAdmin = requirePermission(['ADMIN_USUARIOS']);

// Permite acesso se o usuário é o dono do registro (autosserviço, ex.: editar o próprio
// perfil no checkin-app) OU se tem permissão de admin de usuários.
async function requireSelfOrUsersAdmin(req, res, next) {
  const callerId = req.user?.userId;
  if (!callerId) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
  if (String(callerId) === String(req.params.id)) {
    return next();
  }
  const isAdmin = await hasUserPermission(callerId, ['ADMIN_USUARIOS']);
  if (isAdmin) {
    return next();
  }
  return res.status(403).json({ message: 'Sem permissão para acessar este usuário.' });
}

router.get('/', requireUsersAdmin, getUsers);
router.post('/sync-members', requireUsersAdmin, postSyncAllUserMembers);
router.post('/:id/sync-member', requireUsersAdmin, postSyncUserMember);
router.post('/:id/send-password-reset', requireUsersAdmin, postSendPasswordReset);
router.get('/:id/spouse', requireSelfOrUsersAdmin, getUserComConjuge);
router.get('/:id', requireSelfOrUsersAdmin, getUserDetalhe);
router.post('/', requireUsersAdmin, postUsers);
router.put('/:id', requireSelfOrUsersAdmin, putUser);

module.exports = router;
