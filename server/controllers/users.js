const {
  getTodosUsers,
  createUser,
  getUserById,
  updateUser,
  getUserWithSpouse,
  syncUserLinkedMember,
  syncAllUsersLinkedMembers
} = require('../services/users');

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
    const user = await updateUser(id, req.body);
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

module.exports = {
  getUsers,
  postUsers,
  getUserDetalhe,
  putUser,
  getUserComConjuge,
  postSyncUserMember,
  postSyncAllUserMembers
};
