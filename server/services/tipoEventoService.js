'use strict';
const { TipoEvento } = require('../models');

const TipoEventoService = {
  async listar(apenasAtivos = false) {
    const where = apenasAtivos ? { ativo: true } : {};
    return TipoEvento.findAll({ where, order: [['nome', 'ASC']] });
  },

  async buscarPorId(id) {
    const tipoEvento = await TipoEvento.findByPk(id);
    if (!tipoEvento) throw new Error('Tipo de evento não encontrado');
    return tipoEvento;
  },

  async criar(dados) {
    return TipoEvento.create(dados);
  },

  async atualizar(id, dados) {
    const tipoEvento = await TipoEvento.findByPk(id);
    if (!tipoEvento) throw new Error('Tipo de evento não encontrado');
    Object.assign(tipoEvento, dados);
    await tipoEvento.save();
    return tipoEvento;
  },

  async alternarAtivo(id) {
    const tipoEvento = await TipoEvento.findByPk(id);
    if (!tipoEvento) throw new Error('Tipo de evento não encontrado');
    tipoEvento.ativo = !tipoEvento.ativo;
    await tipoEvento.save();
    return tipoEvento;
  },
};

module.exports = TipoEventoService;
