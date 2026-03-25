'use strict';
const { Ministro } = require('../models');

const MinistroService = {
  async listar(apenasAtivos = false) {
    const where = apenasAtivos ? { ativo: true } : {};
    return Ministro.findAll({ where, order: [['nome', 'ASC']] });
  },

  async buscarPorId(id) {
    const ministro = await Ministro.findByPk(id);
    if (!ministro) throw new Error('Ministro não encontrado');
    return ministro;
  },

  async criar(dados) {
    return Ministro.create(dados);
  },

  async atualizar(id, dados) {
    const ministro = await Ministro.findByPk(id);
    if (!ministro) throw new Error('Ministro não encontrado');
    Object.assign(ministro, dados);
    await ministro.save();
    return ministro;
  },

  async alternarAtivo(id) {
    const ministro = await Ministro.findByPk(id);
    if (!ministro) throw new Error('Ministro não encontrado');
    ministro.ativo = !ministro.ativo;
    await ministro.save();
    return ministro;
  },
};

module.exports = MinistroService;
