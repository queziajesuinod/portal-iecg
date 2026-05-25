const uuid = require('uuid');
const { Campus, Member } = require('../models');

const PASTOR_INCLUDE = {
  model: Member,
  as: 'pastoresResponsaveisMembers',
  attributes: ['id', 'fullName', 'photoUrl'],
  through: { attributes: [] }
};

async function listar() {
  return Campus.findAll({
    include: [PASTOR_INCLUDE],
    order: [['nome', 'ASC']]
  });
}

async function syncPastoresResponsaveis(campus, body) {
  if (!Object.prototype.hasOwnProperty.call(body, 'pastoresResponsaveisMemberIds')) return;
  const ids = Array.isArray(body.pastoresResponsaveisMemberIds)
    ? body.pastoresResponsaveisMemberIds.filter(Boolean)
    : [];
  await campus.setPastoresResponsaveisMembers(ids);
}

async function reloadWithIncludes(campus) {
  return Campus.findByPk(campus.id, { include: [PASTOR_INCLUDE] });
}

async function criar(body) {
  const {
    nome, endereco, pastoresResponsaveis, bairro, cidade, estado, lat, lon, transmiteOnline
  } = body;
  if (!nome) {
    throw new Error('Nome do campus é obrigatório');
  }
  const campus = await Campus.create({
    id: uuid.v4(),
    nome,
    endereco,
    pastoresResponsaveis,
    bairro,
    cidade,
    estado,
    lat,
    lon,
    transmiteOnline: transmiteOnline ?? false,
  });
  await syncPastoresResponsaveis(campus, body);
  return reloadWithIncludes(campus);
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
  if (body.transmiteOnline !== undefined) campus.transmiteOnline = body.transmiteOnline;
  await campus.save();
  await syncPastoresResponsaveis(campus, body);
  return reloadWithIncludes(campus);
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
