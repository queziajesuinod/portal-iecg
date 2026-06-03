const {
  CampusMinisterio, Ministerio, Campus, Member
} = require('../models');

const CampusMinisterioService = {
  async listarMinisteriosPorCampus(campusId) {
    const vinculos = await CampusMinisterio.findAll({
      where: { campusId },
      include: [{ model: Ministerio, as: 'ministerio', where: { ativo: true } }],
      order: [[{ model: Ministerio, as: 'ministerio' }, 'nome', 'ASC']],
    });
    return vinculos.map((v) => v.ministerio);
  },

  async listarCampusPorMinisterio(ministerioId) {
    const vinculos = await CampusMinisterio.findAll({
      where: { ministerioId },
      include: [{ model: Campus, as: 'campus' }],
      order: [[{ model: Campus, as: 'campus' }, 'nome', 'ASC']],
    });
    return vinculos.map((v) => v.campus).filter(Boolean);
  },

  async listarVinculosPorCampus(campusId) {
    const [campus, todosMinisterios, vinculos] = await Promise.all([
      Campus.findByPk(campusId),
      Ministerio.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] }),
      CampusMinisterio.findAll({
        where: { campusId },
        include: [
          {
            model: Member,
            as: 'responsavel',
            attributes: ['id', 'fullName', 'preferredName', 'whatsapp', 'phone'],
            required: false,
          },
        ],
      }),
    ]);

    if (!campus) throw new Error('Campus não encontrado');

    const vinculosMap = new Map(vinculos.map((v) => [v.ministerioId, v]));

    return {
      campus,
      ministerios: todosMinisterios.map((m) => {
        const vinculo = vinculosMap.get(m.id);
        return {
          ...m.toJSON(),
          vinculado: !!vinculo,
          diasPadrao: vinculo?.diasPadrao ?? [],
          responsavelMemberId: vinculo?.responsavelMemberId ?? null,
          responsavel: vinculo?.responsavel ?? null,
          validacaoAtiva: vinculo?.validacaoAtiva ?? false,
        };
      }),
    };
  },

  async salvarVinculos(campusId, ministerioIds) {
    const campus = await Campus.findByPk(campusId);
    if (!campus) throw new Error('Campus não encontrado');

    const vinculosAtuais = await CampusMinisterio.findAll({ where: { campusId } });
    const idsAtuais = new Set(vinculosAtuais.map((v) => v.ministerioId));
    const idsNovos = new Set(ministerioIds || []);

    // Remove vínculos que saíram da lista (sem apagar configs dos que permanecem)
    const paraRemover = vinculosAtuais.filter((v) => !idsNovos.has(v.ministerioId));
    if (paraRemover.length > 0) {
      await CampusMinisterio.destroy({
        where: { campusId, ministerioId: paraRemover.map((v) => v.ministerioId) },
      });
    }

    // Cria apenas os vínculos novos (preserva configs dos existentes)
    const paraAdicionar = [...idsNovos].filter((id) => !idsAtuais.has(id));
    if (paraAdicionar.length > 0) {
      await CampusMinisterio.bulkCreate(
        paraAdicionar.map((ministerioId) => ({ campusId, ministerioId }))
      );
    }
  },

  async atualizarConfiguracao(campusId, ministerioId, dados) {
    const vinculo = await CampusMinisterio.findOne({ where: { campusId, ministerioId } });
    if (!vinculo) throw new Error('Vínculo não encontrado');

    const campos = {};
    if (Array.isArray(dados.diasPadrao)) campos.diasPadrao = dados.diasPadrao;
    if ('responsavelMemberId' in dados) campos.responsavelMemberId = dados.responsavelMemberId || null;
    if (typeof dados.validacaoAtiva === 'boolean') campos.validacaoAtiva = dados.validacaoAtiva;

    await vinculo.update(campos);

    await vinculo.reload({
      include: [
        {
          model: Member,
          as: 'responsavel',
          attributes: ['id', 'fullName', 'preferredName', 'whatsapp', 'phone'],
          required: false,
        },
      ],
    });

    return vinculo;
  },

  async buscarVinculo(campusId, ministerioId) {
    const vinculo = await CampusMinisterio.findOne({
      where: { campusId, ministerioId },
      include: [
        { model: Campus, as: 'campus' },
        { model: Ministerio, as: 'ministerio' },
        {
          model: Member,
          as: 'responsavel',
          attributes: ['id', 'fullName', 'preferredName', 'whatsapp', 'phone'],
          required: false,
        },
      ],
    });
    if (!vinculo) throw new Error('Vínculo não encontrado');
    return vinculo;
  },
};

module.exports = CampusMinisterioService;
