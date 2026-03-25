'use strict';
const { CampusMinisterio, Ministerio, Campus } = require('../models');

const CampusMinisterioService = {
  async listarMinisteriosPorCampus(campusId) {
    const vinculos = await CampusMinisterio.findAll({
      where: { campusId },
      include: [{ model: Ministerio, as: 'ministerio', where: { ativo: true } }],
      order: [[{ model: Ministerio, as: 'ministerio' }, 'nome', 'ASC']],
    });
    return vinculos.map((v) => v.ministerio);
  },

  async listarVinculosPorCampus(campusId) {
    const [campus, todosMinisterios, vinculos] = await Promise.all([
      Campus.findByPk(campusId),
      Ministerio.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] }),
      CampusMinisterio.findAll({ where: { campusId } }),
    ]);

    if (!campus) throw new Error('Campus não encontrado');

    const vinculadosIds = new Set(vinculos.map((v) => v.ministerioId));
    return {
      campus,
      ministerios: todosMinisterios.map((m) => ({
        ...m.toJSON(),
        vinculado: vinculadosIds.has(m.id),
      })),
    };
  },

  async salvarVinculos(campusId, ministerioIds) {
    const campus = await Campus.findByPk(campusId);
    if (!campus) throw new Error('Campus não encontrado');

    await CampusMinisterio.destroy({ where: { campusId } });

    if (ministerioIds && ministerioIds.length > 0) {
      const registros = ministerioIds.map((ministerioId) => ({ campusId, ministerioId }));
      await CampusMinisterio.bulkCreate(registros);
    }
  },
};

module.exports = CampusMinisterioService;
