const {
  getTodosUsers,
  createUser,
  getUserById,
  updateUser,
  getUserWithSpouse,
  syncUserLinkedMember,
  syncAllUsersLinkedMembers
} = require('../services/users');
const { hasUserPermission } = require('../services/permissionResolver');
const AuthService = require('../services/auth');

const authService = new AuthService();

// Campos que só um admin de usuários pode alterar. Em autosserviço (usuário editando o
// próprio registro) esses campos são removidos para impedir escalonamento de privilégio.
const PRIVILEGED_USER_FIELDS = ['perfilId', 'perfilIds', 'permissaoIds', 'active'];

async function getUsers(req, res) {
  try {
    const users = await getTodosUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('Erro ao buscar usuarios:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function getUserDetalhe(req, res) {
  try {
    const user = await getUserById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao buscar usuario:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function putUser(req, res) {
  try {
    const { id } = req.params;
    const callerId = req.user?.userId;
    const isAdmin = await hasUserPermission(callerId, ['ADMIN_USUARIOS']);

    const body = { ...req.body };
    // Sem permissão de admin, remove campos privilegiados: impede que o usuário
    // se promova a admin (perfilId/perfilIds/permissaoIds) ou reative a conta.
    if (!isAdmin) {
      PRIVILEGED_USER_FIELDS.forEach((field) => delete body[field]);
    }

    const user = await updateUser(id, body);
    res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao atualizar usuario:', error);
    res.status(400).json({ message: error.message });
  }
}

async function postUsers(req, res) {
  try {
    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Erro ao criar usuario:', error);
    res.status(400).send({ message: error.message });
  }
}

async function getUserComConjuge(req, res) {
  try {
    const result = await getUserWithSpouse(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Usuario nao encontrado' });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao buscar usuario com conjuge:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

async function postSyncUserMember(req, res) {
  try {
    const result = await syncUserLinkedMember(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao sincronizar membro do usuario:', error);
    res.status(400).json({ message: error.message });
  }
}

async function postSyncAllUserMembers(req, res) {
  try {
    const result = await syncAllUsersLinkedMembers();
    res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao sincronizar membros dos usuarios:', error);
    res.status(500).json({ message: error.message || 'Erro interno do servidor' });
  }
}

async function postSendPasswordReset(req, res) {
  try {
    const result = await authService.resetPasswordByUserId(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao enviar redefinicao de senha:', error.message);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor' });
  }
}

module.exports = {
  getUsers,
  postUsers,
  getUserDetalhe,
  putUser,
  getUserComConjuge,
  postSyncUserMember,
  postSyncAllUserMembers,
  postSendPasswordReset
};
