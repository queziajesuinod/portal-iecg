const { Op } = require('sequelize');
const {
  Celula, Member, MemberCargo
} = require('../models');
const webhookEmitter = require('./webhookEmitter');
const CelulaService = require('./celulaService');

// leaderId (id do User) chega do formulario publico; a coluna da celula e liderId.
const normalizeLeaderId = (payload) => {
  if (payload.leaderId && !payload.liderId) {
    payload.liderId = payload.leaderId;
  }
  delete payload.leaderId;
  return payload;
};

const sanitizeCelular = (valor) => {
  if (!valor) return '';
  return String(valor).replace(/\D/g, '');
};

const preparePayload = (dados = {}) => {
  const payload = { ...dados };
  if (Object.prototype.hasOwnProperty.call(payload, 'cel_lider')) {
    payload.cel_lider = sanitizeCelular(payload.cel_lider);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'celula') && payload.celula) {
    payload.celula = String(payload.celula).trim();
  }
  return payload;
};

const CelulaPublicService = {
  async buscarPorCampos(campos = {}) {
    const payload = preparePayload(campos);
    const where = {};
    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value === undefined || value === null || value === '') {
        return;
      }
      where[key] = value;
    });

    if (!Object.keys(where).length) {
      throw new Error('Informe ao menos um campo para identificar a celula.');
    }

    return Celula.findOne({ where });
  },

  async criar(dados = {}) {
    if (!dados.celula) {
      throw new Error('Nome da celula (celula) e obrigatorio');
    }
    const payload = normalizeLeaderId(preparePayload(dados));
    // liderId -> liderMemberId e (se so veio a Lideranca) preenche PdG/PdC.
    await CelulaService.resolveLeaderLinks(payload);
    await CelulaService.resolveHierarchyFromLideranca(payload);
    const created = await Celula.create(payload);
    webhookEmitter.emit('celula.created', {
      id: created.id,
      nome: created.celula,
      bairro: created.bairro,
      rede: created.rede,
      lider: created.lider
    });
    return created;
  },

  async buscarPorContato(contato) {
    if (!contato) {
      throw new Error('Parametro de contato (email ou cel_lider) e obrigatorio');
    }

    const contatoSanitizado = sanitizeCelular(contato);
    const isTelefone = contatoSanitizado.length >= 8;

    const celulas = await Celula.findAll({
      where: {
        [Op.or]: [
          { email_lider: contato },
          ...(isTelefone
            ? [{ cel_lider: contatoSanitizado }]
            : [{ cel_lider: contato }])
        ]
      }
    });

    if (!celulas.length) {
      throw new Error('Celula nao encontrada');
    }

    return celulas;
  },

  async atualizar(id, dados = {}) {
    if (!id) {
      throw new Error('ID da celula e obrigatorio');
    }
    if (!dados || Object.keys(dados).length === 0) {
      throw new Error('Dados para atualizacao sao obrigatorios');
    }

    const celula = await Celula.findByPk(id);
    if (!celula) {
      throw new Error('Celula nao encontrada');
    }

    const {
      id: _, createdAt, updatedAt, ...rest
    } = dados;
    const payload = normalizeLeaderId(preparePayload(rest));
    await CelulaService.resolveLeaderLinks(payload);
    await CelulaService.resolveHierarchyFromLideranca(payload);

    const updated = await celula.update(payload);
    webhookEmitter.emit('celula.updated', {
      id: updated.id,
      nome: updated.celula,
      bairro: updated.bairro,
      rede: updated.rede,
      lider: updated.lider
    });
    return updated;
  },

  /**
   * Opcoes para os selects de hierarquia do formulario publico de celula.
   * Retorna membros com cargo de Lideranca Apostolica (ja com os pastores
   * vinculados, para auto-preencher), e as listas de Pastor de Geracao/Campus.
   */
  async listarHierarquiaOptions() {
    const buscarPorCargo = (cargo, extraAttrs = [], extraIncludes = []) => Member.findAll({
      attributes: ['id', 'fullName', ...extraAttrs],
      include: [
        {
          model: MemberCargo,
          as: 'cargos',
          where: { cargo, ativo: true },
          attributes: [],
          required: true
        },
        ...extraIncludes
      ],
      order: [['fullName', 'ASC']],
      subQuery: false
    });

    const [liderancasRaw, pastoresGeracao, pastoresCampus] = await Promise.all([
      buscarPorCargo(
        'lideranca_apostolica',
        ['pastorGeracaoMemberId', 'pastorCampusMemberId'],
        [
          { model: Member, as: 'pastorGeracao', attributes: ['id', 'fullName'] },
          { model: Member, as: 'pastorCampus', attributes: ['id', 'fullName'] }
        ]
      ),
      buscarPorCargo('pastor_geracao'),
      buscarPorCargo('pastor_campus')
    ]);

    const simples = (m) => ({ id: m.id, fullName: m.fullName });

    return {
      liderancas: liderancasRaw.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        pastorGeracaoMemberId: m.pastorGeracaoMemberId || null,
        pastorGeracao: m.pastorGeracao ? simples(m.pastorGeracao) : null,
        pastorCampusMemberId: m.pastorCampusMemberId || null,
        pastorCampus: m.pastorCampus ? simples(m.pastorCampus) : null
      })),
      pastoresGeracao: pastoresGeracao.map(simples),
      pastoresCampus: pastoresCampus.map(simples)
    };
  }
};

module.exports = CelulaPublicService;
