'use strict';
const { Ministerio } = require('../models');

const MinisterioService = {
  async listar(apenasAtivos = false) {
    const where = apenasAtivos ? { ativo: true } : {};
    return Ministerio.findAll({ where, order: [['nome', 'ASC']] });
  },

  async buscarPorId(id) {
    const ministerio = await Ministerio.findByPk(id);
    if (!ministerio) throw new Error('Ministério não encontrado');
    return ministerio;
  },

  async criar(dados) {
    return Ministerio.create(dados);
  },

  async atualizar(id, dados) {
    const ministerio = await Ministerio.findByPk(id);
    if (!ministerio) throw new Error('Ministério não encontrado');
    Object.assign(ministerio, dados);
    await ministerio.save();
    return ministerio;
  },

  async alternarAtivo(id) {
    const ministerio = await Ministerio.findByPk(id);
    if (!ministerio) throw new Error('Ministério não encontrado');
    ministerio.ativo = !ministerio.ativo;
    await ministerio.save();
    return ministerio;
  },
};

module.exports = MinisterioService;
