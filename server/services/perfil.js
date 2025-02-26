const { Perfil } = require('../models');  // Importa o modelo inicializado
const uuid = require('uuid');

async function getTodosPerfis() {
  const perfis = await Perfil.findAll();
  return perfis;
}

async function getPerfilById(id) {
  const perfil = await Perfil.findByPk(id);
  return perfil;
}

async function createPerfil(body) {
  const { descricao } = body;
  const newPerfil = await Perfil.create({
    id: uuid.v4(),
    descricao
  });
  return newPerfil;
}

module.exports = {
  getTodosPerfis,
  createPerfil,
  getPerfilById
};
