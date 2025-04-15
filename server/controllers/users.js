const { getTodosUsers, createUser, getUserById, updateUser } = require("../services/users");

async function getUsers(req, res) {
    try {
        const users = await getTodosUsers(); // Busca todos os usuários
        res.status(200).json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).send('Erro interno do servidor');
    }
}

async function getUserDetalhe(req, res) {
    try {
        const user = await getUserById(req.params.id);
        res.status(200).json(user);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).send('Erro interno do servidor');
    }
}

const { getTodosUsers, createUser, getUserById, updateUser } = require("../services/users");

async function putUser(req, res) {
  try {
    const id = req.params.id;
    const user = await updateUser(id, req.body);
    res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(400).json({ message: error.message });
  }
}


async function postUsers(req, res) {
    try {
        const user = await createUser(req.body); // Função de criação de usuário
        res.status(201).json(user);
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(400).send({ message: error.message });
    }
}

module.exports = {
    getUsers,
    postUsers,
    getUserDetalhe,
    putUser
};
