const { Campus } = require('../models');
const uuid = require('uuid');

async function listar() {
  return Campus.findAll({ order: [['nome', 'ASC']] });
}

async function criar(body) {
  const { nome, endereco, pastoresResponsaveis, bairro, cidade, estado, lat, lon } = body;
  if (!nome) {
    throw new Error('Nome do campus é obrigatório');
  }
  return Campus.create({
    id: uuid.v4(),
    nome,
    endereco,
    pastoresResponsaveis,
    bairro,
    cidade,
    estado,
    lat,
    lon,
  });
}

async function atualizar(id, body) {
  const campus = await Campus.findByPk(id);
  if (!campus) {
    throw new Error('Campus não encontrado');
  }
  campus.nome = body.nome ?? campus.nome;
  campus.endereco = body.endereco ?? campus.endereco;
  campus.bairro = body.bairro ?? campus.bairro;
  campus.cidade = body.cidade ?? campus.cidade;
  campus.estado = body.estado ?? campus.estado;
  campus.pastoresResponsaveis = body.pastoresResponsaveis ?? campus.pastoresResponsaveis;
  campus.lat = body.lat ?? campus.lat;
  campus.lon = body.lon ?? campus.lon;
  await campus.save();
  return campus;
}

async function deletar(id) {
  const campus = await Campus.findByPk(id);
  if (!campus) {
    throw new Error('Campus não encontrado');
  }
  await campus.destroy();
}

module.exports = {
  listar,
  criar,
  atualizar,
  deletar,
};
