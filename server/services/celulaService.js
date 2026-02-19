const { Celula, Campus, Member } = require('../models');
const { Op } = require('sequelize');
const webhookEmitter = require('./webhookEmitter');

const sanitizeCelular = (valor) => {
  if (!valor) return '';
  return String(valor).replace(/\D/g, '');
};

const defaultCelulaIncludes = [
  {
    model: Campus,
    as: 'campusRef',
    attributes: ['id', 'nome']
  },
  {
    model: Member,
    as: 'liderMemberRef',
    attributes: ['id', 'fullName', 'userId', 'email', 'phone', 'whatsapp', 'photoUrl']
  }
];

const celulaForLeaderSearchIncludes = [
  {
    model: Campus,
    as: 'campusRef',
    attributes: ['id', 'nome']
  }
];

const CelulaService = {
  async resolveLeaderLinks(payload = {}) {
    if (Object.prototype.hasOwnProperty.call(payload, 'liderMemberId')) {
      if (!payload.liderMemberId) {
        payload.liderMemberId = null;
        payload.liderId = null;
        return payload;
      }

      const member = await Member.findByPk(payload.liderMemberId, {
        attributes: ['id', 'userId']
      });
      if (!member) {
        throw new Error('Membro líder informado não encontrado');
      }
      payload.liderMemberId = member.id;
      payload.liderId = member.userId || null;
      return payload;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'liderId')) {
      if (!payload.liderId) {
        payload.liderId = null;
        payload.liderMemberId = null;
        return payload;
      }
      const member = await Member.findOne({
        where: { userId: payload.liderId },
        attributes: ['id']
      });
      payload.liderMemberId = member?.id || null;
      return payload;
    }

    return payload;
  },

  async criarCelula(dados = {}) {
    const payload = { ...dados };
    if (payload.campus && !payload.campusId) {
      const campus = await Campus.findOne({
        where: {
          nome: {
            [Op.iLike]: `%${payload.campus}%`
          }
        }
      });
      if (campus) {
        payload.campusId = campus.id;
      }
    }
    if (typeof payload.ativo === 'undefined') {
      payload.ativo = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'cel_lider')) {
      payload.cel_lider = sanitizeCelular(payload.cel_lider);
    }
    await CelulaService.resolveLeaderLinks(payload);

    const celula = await Celula.create(payload);
    webhookEmitter.emit('celula.created', {
      id: celula.id,
      data: payload
    });
    return celula;
  },

  async buscarTodasCelulas() {
    return Celula.findAll({ include: defaultCelulaIncludes });
  },

  async buscaPaginada(page, limit) {
    return CelulaService.buscaComFiltros({}, page, limit);
  },

  async buscaComFiltros(filtros = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filtros.celula) {
      where.celula = { [Op.iLike]: `%${filtros.celula}%` };
    }
    if (filtros.campusId) {
      where.campusId = filtros.campusId;
    } else if (filtros.campus) {
      where.campus = { [Op.iLike]: `%${filtros.campus}%` };
    }
    if (filtros.rede) {
      const redeValues = Array.isArray(filtros.rede) ? filtros.rede : [filtros.rede];
      const redeConditions = redeValues
        .map((redeValue) => redeValue && redeValue.trim())
        .filter(Boolean)
        .map((redeValue) => ({ [Op.iLike]: `%${redeValue}%` }));
      if (redeConditions.length) {
        where.rede = { [Op.or]: redeConditions };
      }
    }
    if (filtros.horario) {
      where.horario = { [Op.iLike]: `%${filtros.horario}%` };
    }
    if (filtros.dia) {
      where.dia = { [Op.iLike]: `%${filtros.dia}%` };
    }
    if (filtros.bairro) {
      where.bairro = { [Op.iLike]: `%${filtros.bairro}%` };
    }
    if (filtros.lider) {
      where.lider = { [Op.iLike]: `%${filtros.lider}%` };
    }
    if (filtros.pastor_geracao) {
      where.pastor_geracao = { [Op.iLike]: `%${filtros.pastor_geracao}%` };
    }
    {
      const ativoValorRaw = filtros.ativo;
      const ativoValor = typeof ativoValorRaw !== 'undefined' && ativoValorRaw !== null
        ? String(ativoValorRaw).toLowerCase().trim()
        : '';
      if (!ativoValor) {
        where.ativo = true;
      } else if (ativoValor !== 'all') {
        where.ativo = !(ativoValor === 'false' || ativoValor === '0' || ativoValor === 'no' || ativoValor === 'off');
      }
    }

    const includes = defaultCelulaIncludes.map((item) => ({ ...item }));
    if (filtros.leaderEmail || filtros.leaderTelefone) {
      const leaderFilter = includes.find((item) => item.as === 'liderMemberRef');
      if (leaderFilter) {
        leaderFilter.required = true;
        leaderFilter.where = {
          ...(filtros.leaderEmail ? { email: { [Op.iLike]: filtros.leaderEmail } } : {}),
          ...(filtros.leaderTelefone
            ? {
              [Op.or]: [
                { phone: sanitizeCelular(filtros.leaderTelefone) },
                { whatsapp: sanitizeCelular(filtros.leaderTelefone) }
              ]
            }
            : {})
        };
      }
    }

    const { count, rows } = await Celula.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: includes
    });

    const totalPaginas = Math.ceil(count / limit) || 1;

    return {
      registros: rows,
      totalPaginas,
      paginaAtual: page,
      totalRegistros: count
    };
  },

  async buscarCelulaPorId(id) {
    const celula = await Celula.findByPk(id, { include: defaultCelulaIncludes });
    if (!celula) {
      throw new Error('Célula não encontrada');
    }
    return celula;
  },

  async atualizarCelula(id, dadosAtualizados = {}) {
    const celula = await CelulaService.buscarCelulaPorId(id);
    const payload = { ...dadosAtualizados };
    if (payload.campus && !payload.campusId) {
      const campus = await Campus.findOne({
        where: {
          nome: {
            [Op.iLike]: `%${payload.campus}%`
          }
        }
      });
      if (campus) {
        payload.campusId = campus.id;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'cel_lider')) {
      payload.cel_lider = sanitizeCelular(payload.cel_lider);
    }
    await CelulaService.resolveLeaderLinks(payload);

    const updated = await celula.update(payload);
    webhookEmitter.emit('celula.updated', {
      id: updated.id,
      data: payload
    });
    return updated;
  },

  async deletarCelula(id) {
    const celula = await CelulaService.buscarCelulaPorId(id);
    await celula.destroy();
    webhookEmitter.emit('celula.deleted', {
      id: celula.id,
      nome: celula.celula,
      bairro: celula.bairro,
      rede: celula.rede
    });
    return { mensagem: 'Célula removida com sucesso' };
  }
,

  async buscarPorContatoLeader({ email, telefone }) {
    if (!email && !telefone) {
      return null;
    }

    const clauses = [];
    if (email) {
      clauses.push({ email: { [Op.iLike]: email } });
    }
    if (telefone) {
      const sanitizedPhone = sanitizeCelular(telefone);
      clauses.push({ phone: sanitizedPhone });
      clauses.push({ whatsapp: sanitizedPhone });
    }

    const leader = await Member.findOne({
      where: {
        [Op.or]: clauses
      },
      attributes: [
        'id',
        'fullName',
        'preferredName',
        'userId',
        'email',
        'phone',
        'whatsapp',
        'birthDate',
        'cpf',
        'maritalStatus',
        'status',
        'street',
        'neighborhood',
        'number',
        'zipCode',
        'photoUrl',
        'notes'
      ],
      include: [
        {
          model: Celula,
          as: 'liderancaCelulas',
          include: celulaForLeaderSearchIncludes
        },
        {
          model: Member,
          as: 'spouse',
          attributes: [
            'id',
            'fullName',
            'email',
            'phone',
            'whatsapp',
            'photoUrl',
            'street',
            'neighborhood',
            'number',
            'zipCode'
          ]
        }
      ]
    });

    return leader;
  }
};

module.exports = CelulaService;
