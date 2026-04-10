'use strict';
const { AreaVoluntariado } = require('../models');

const AreaVoluntariadoService = {
  async listar(apenasAtivos = false) {
    const where = apenasAtivos ? { ativo: true } : {};
    return AreaVoluntariado.findAll({ where, order: [['nome', 'ASC']] });
  },

  async buscarPorId(id) {
    const area = await AreaVoluntariado.findByPk(id);
    if (!area) throw new Error('Área de voluntariado não encontrada');
    return area;
  },

  async criar(dados) {
    return AreaVoluntariado.create(dados);
  },

  async atualizar(id, dados) {
    const area = await AreaVoluntariado.findByPk(id);
    if (!area) throw new Error('Área de voluntariado não encontrada');
    Object.assign(area, dados);
    await area.save();
    return area;
  },

  async alternarAtivo(id) {
    const area = await AreaVoluntariado.findByPk(id);
    if (!area) throw new Error('Área de voluntariado não encontrada');
    area.ativo = !area.ativo;
    await area.save();
    return area;
  }
};

module.exports = AreaVoluntariadoService;
