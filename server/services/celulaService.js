const { Celula, Campus, User } = require('../models');
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
    model: User,
    as: 'liderRef',
    attributes: ['id', 'name', 'email', 'telefone', 'username', 'is_lider_celula']
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

    const includes = [...defaultCelulaIncludes];
    if (filtros.leaderEmail || filtros.leaderTelefone) {
      includes.push({
        model: User,
        as: 'liderRef',
        required: true,
        where: {
          ...(filtros.leaderEmail ? { email: { [Op.iLike]: filtros.leaderEmail } } : {}),
          ...(filtros.leaderTelefone ? { telefone: sanitizeCelular(filtros.leaderTelefone) } : {})
        }
      });
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
      clauses.push({ telefone: sanitizeCelular(telefone) });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: clauses
      },
      attributes: [
        'id',
        'name',
        'email',
        'telefone',
        'username',
        'is_lider_celula',
        'data_nascimento',
        'cpf',
        'estado_civil',
        'profissao',
        'batizado',
        'encontro',
        'escolas',
        'image',
        'conjuge_id'
      ],
      include: [
        {
          model: Celula,
          as: 'lideranca',
          include: celulaForLeaderSearchIncludes
        },
        {
          model: User,
          as: 'conjuge',
          attributes: ['id', 'name', 'email', 'telefone', 'username', 'image']
        }
      ]
    });

    return user;
  }
};

module.exports = CelulaService;
