const {
  CampusMinisterio, Ministerio, Campus, Member
} = require('../models');

/**
 * Retorna o config de horários vigente HOJE a partir do formato versionado ou legado.
 * Usado para exibir no formulário de configuração.
 */
function resolverHorariosAtual(horariosPadrao) {
  if (!horariosPadrao) return {};
  if (!Array.isArray(horariosPadrao)) return horariosPadrao; // formato legado
  const hoje = new Date().toISOString().slice(0, 10);
  const versao = horariosPadrao
    .filter((v) => v.vigenteDe && v.vigenteDe <= hoje && (v.vigenteAte == null || v.vigenteAte >= hoje))
    .sort((a, b) => b.vigenteDe.localeCompare(a.vigenteDe))[0];
  return versao?.config || {};
}

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
          horariosPadrao: resolverHorariosAtual(vinculo?.horariosPadrao),
          horariosPadraoHistorico: Array.isArray(vinculo?.horariosPadrao) ? vinculo.horariosPadrao : [],
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
    if (dados.horariosPadrao !== undefined) {
      // Converte para formato versionado se vier como objeto simples (legado ou primeira config)
      const novoConfig = dados.horariosPadrao || {};
      const hoje = new Date().toISOString().slice(0, 10);

      if (Array.isArray(novoConfig)) {
        // Já está no formato versionado — usa diretamente (ex: array vazio ao limpar)
        campos.horariosPadrao = novoConfig;
      } else if (Object.keys(novoConfig).length === 0) {
        // Config vazia = limpou tudo — reseta para array vazio (sem histórico)
        campos.horariosPadrao = [];
      } else if (!dados.novaVigencia) {
        // Edição simples: atualiza o config da versão atual sem criar nova vigência
        const historicoAtual = Array.isArray(dados.horariosPadraoHistorico)
          ? dados.horariosPadraoHistorico
          : (Array.isArray(vinculo.horariosPadrao) ? vinculo.horariosPadrao : []);

        const temVersaoAberta = historicoAtual.some((v) => v.vigenteAte == null);
        if (temVersaoAberta) {
          // Atualiza o config da versão aberta
          campos.horariosPadrao = historicoAtual.map((v) => (v.vigenteAte == null ? { ...v, config: novoConfig } : v));
        } else {
          // Não há versão aberta — cria a primeira com vigenteDe = hoje
          campos.horariosPadrao = [...historicoAtual, { vigenteDe: hoje, vigenteAte: null, config: novoConfig }];
        }
      } else {
        // Nova vigência: encerra a versão anterior e cria nova a partir da data informada
        const novaVigenteDe = dados.vigenteDe || hoje;
        const historicoAtual = Array.isArray(dados.horariosPadraoHistorico)
          ? dados.horariosPadraoHistorico
          : (Array.isArray(vinculo.horariosPadrao) ? vinculo.horariosPadrao : []);

        // vigenteAte da versão anterior = novaVigenteDe - 1 dia
        const dFim = new Date(novaVigenteDe);
        dFim.setDate(dFim.getDate() - 1);
        const fimAnterior = dFim.toISOString().slice(0, 10);

        // Encerra a versão aberta e adiciona a nova
        const historico = historicoAtual.map((v) => (v.vigenteAte == null ? { ...v, vigenteAte: fimAnterior } : v));
        campos.horariosPadrao = [...historico, { vigenteDe: novaVigenteDe, vigenteAte: null, config: novoConfig }];
      }
    }
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
