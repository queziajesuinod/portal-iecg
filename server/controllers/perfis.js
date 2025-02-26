const { getTodosPerfis, createPerfil, getPerfilById } = require("../services/perfil");

async function getPerfils(req, res) {
  try {
    const perfils = await getTodosPerfis();
    res.status(200).json(perfils);
  } catch (error) {
    console.error('Erro ao buscar perfils:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function getPerfilDetalhe(req, res) {
  try {
    const perfil = await getPerfilById(req.params.id);
    res.status(200).json(perfil);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function postPerfil(req, res) {
  try {
    const perfil = await createPerfil(req.body);
    res.status(201).json(perfil);
  } catch (error) {
    console.error('Erro ao criar perfil:', error);
    res.status(500).send({ message: error.message });
  }
}

module.exports = {
  getPerfils,
  postPerfil,
  getPerfilDetalhe
};
