const { Perfil, Permissao } = require('../models');  // Importa os modelos inicializados
const uuid = require('uuid');

async function getTodosPerfis() {
  return Perfil.findAll({
    include: [{ model: Permissao, as: 'permissoes', through: { attributes: [] } }]
  });
}

async function getPerfilById(id) {
  return Perfil.findByPk(id, {
    include: [{ model: Permissao, as: 'permissoes', through: { attributes: [] } }]
  });
}

async function createPerfil(body) {
  const { descricao } = body;
  const newPerfil = await Perfil.create({
    id: uuid.v4(),
    descricao
  });
  return newPerfil;
}

async function atualizarPermissoes(perfilId, permissoesIds = []) {
  const perfil = await Perfil.findByPk(perfilId);
  if (!perfil) {
    throw new Error('Perfil nao encontrado');
  }
  const permissoes = await Permissao.findAll({
    where: { id: permissoesIds }
  });
  await perfil.setPermissoes(permissoes);
  return perfil.reload({
    include: [{ model: Permissao, as: 'permissoes', through: { attributes: [] } }]
  });
}

module.exports = {
  getTodosPerfis,
  createPerfil,
  getPerfilById,
  atualizarPermissoes
};
