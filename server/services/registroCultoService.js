'use strict';
const { Op } = require('sequelize');
const { RegistroCulto, Campus, Ministerio, TipoEvento, Ministro } = require('../models');

const includeBase = [
  { model: Campus, as: 'campus', attributes: ['id', 'nome', 'transmiteOnline'] },
  { model: Ministerio, as: 'ministerio', attributes: ['id', 'nome', 'exibeCriancas', 'exibeBebes', 'apeloDefault'] },
  { model: TipoEvento, as: 'tipoEvento', attributes: ['id', 'nome'] },
];

const buildInclude = (ministroId) => {
  const ministroInclude = ministroId
    ? { model: Ministro, as: 'ministros', where: { id: ministroId }, required: true, through: { attributes: [] }, attributes: ['id', 'nome'] }
    : { model: Ministro, as: 'ministros', attributes: ['id', 'nome'], through: { attributes: [] } };
  return [...includeBase, ministroInclude];
};

const RegistroCultoService = {
  async listar(filtros = {}, page = 1, limit = 15) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filtros.campusId) where.campusId = filtros.campusId;
    if (filtros.ministerioId) where.ministerioId = filtros.ministerioId;
    if (filtros.tipoEventoId) where.tipoEventoId = filtros.tipoEventoId;
    if (filtros.dataInicio || filtros.dataFim) {
      where.data = {};
      if (filtros.dataInicio) where.data[Op.gte] = filtros.dataInicio;
      if (filtros.dataFim) where.data[Op.lte] = filtros.dataFim;
    }

    const include = buildInclude(filtros.ministroId || null);

    const { rows, count } = await RegistroCulto.findAndCountAll({
      where,
      include,
      offset,
      limit,
      order: [['data', 'DESC'], ['horario', 'DESC']],
      distinct: true,
    });

    return { data: rows, total: count, pages: Math.ceil(count / limit) };
  },

  async buscarPorId(id) {
    const registro = await RegistroCulto.findByPk(id, { include: buildInclude(null) });
    if (!registro) throw new Error('Registro não encontrado');
    return registro;
  },

  async criar(dados) {
    const { ministroIds, ...camposRegistro } = dados;

    // Deriva quemMinistrou dos ministros selecionados
    if (ministroIds && ministroIds.length > 0) {
      const ministros = await Ministro.findAll({ where: { id: ministroIds } });
      camposRegistro.quemMinistrou = ministros.map((m) => m.nome).join(', ');
    }

    const registro = await RegistroCulto.create(camposRegistro);

    if (ministroIds && ministroIds.length > 0) {
      await registro.setMinistros(ministroIds);
    }

    return registro.reload({ include: buildInclude(null) });
  },

  async atualizar(id, dados) {
    const { ministroIds, ...camposRegistro } = dados;

    const registro = await RegistroCulto.findByPk(id);
    if (!registro) throw new Error('Registro não encontrado');

    if (ministroIds !== undefined) {
      if (ministroIds.length > 0) {
        const ministros = await Ministro.findAll({ where: { id: ministroIds } });
        camposRegistro.quemMinistrou = ministros.map((m) => m.nome).join(', ');
      } else {
        camposRegistro.quemMinistrou = null;
      }
      await registro.setMinistros(ministroIds);
    }

    Object.assign(registro, camposRegistro);
    await registro.save();
    return registro.reload({ include: buildInclude(null) });
  },

  async deletar(id) {
    const registro = await RegistroCulto.findByPk(id);
    if (!registro) throw new Error('Registro não encontrado');
    await registro.destroy();
  },

  async dashboard(filtros = {}) {
    const where = {};

    if (filtros.campusId) where.campusId = filtros.campusId;
    if (filtros.ministerioId) where.ministerioId = filtros.ministerioId;
    if (filtros.dataInicio || filtros.dataFim) {
      where.data = {};
      if (filtros.dataInicio) where.data[Op.gte] = filtros.dataInicio;
      if (filtros.dataFim) where.data[Op.lte] = filtros.dataFim;
    }

    const registros = await RegistroCulto.findAll({
      where,
      include: includeBase,
      order: [['data', 'ASC']],
    });

    let totalHomens = 0, totalMulheres = 0, totalCriancas = 0, totalBebes = 0;
    let totalOnline = 0, totalVoluntarios = 0, totalApelos = 0, totalPessoasApelo = 0;

    const porData = {};
    const porMinisterio = {};

    for (const r of registros) {
      const d = r.toJSON();
      totalHomens += d.qtdHomens || 0;
      totalMulheres += d.qtdMulheres || 0;
      totalCriancas += d.qtdCriancas || 0;
      totalBebes += d.qtdBebes || 0;
      totalOnline += d.qtdOnline || 0;
      totalVoluntarios += d.qtdVoluntarios || 0;
      if (d.teveApelo) {
        totalApelos += 1;
        totalPessoasApelo += d.qtdApelo || 0;
      }

      const presenca = (d.qtdHomens || 0) + (d.qtdMulheres || 0) + (d.qtdCriancas || 0) + (d.qtdBebes || 0);
      if (!porData[d.data]) porData[d.data] = 0;
      porData[d.data] += presenca;

      const nomeMin = d.ministerio?.nome || 'Desconhecido';
      if (!porMinisterio[nomeMin]) porMinisterio[nomeMin] = 0;
      porMinisterio[nomeMin] += presenca;
    }

    return {
      totalCultos: registros.length,
      totalHomens,
      totalMulheres,
      totalCriancas,
      totalBebes,
      totalPresenca: totalHomens + totalMulheres + totalCriancas + totalBebes,
      totalOnline,
      totalVoluntarios,
      totalApelos,
      totalPessoasApelo,
      evolucaoPresenca: Object.entries(porData).map(([data, presenca]) => ({ data, presenca })),
      presencaPorMinisterio: Object.entries(porMinisterio).map(([nome, presenca]) => ({ nome, presenca })),
    };
  },
};

module.exports = RegistroCultoService;
