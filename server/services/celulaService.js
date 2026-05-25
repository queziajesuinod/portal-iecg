const { Op } = require('sequelize');
const {
  Celula, Campus, Member, User, ApeloDirecionadoCelula, MemberCargo
} = require('../models');
const webhookEmitter = require('./webhookEmitter');
const { topMatches } = require('../utils/nameMatcher');

const sanitizeCelular = (valor) => {
  if (!valor) return '';
  return String(valor).replace(/\D/g, '');
};

const findLeaderMemberForCelula = async (celula, transaction = null) => {
  if (!celula) return null;

  if (celula.liderMemberId) {
    const member = await Member.findByPk(celula.liderMemberId, { transaction });
    if (member) return member;
  }

  if (celula.liderId) {
    const member = await Member.findOne({
      where: { userId: celula.liderId },
      transaction
    });
    if (member) return member;
  }

  return null;
};

const syncLeaderMemberPhone = async ({ celula, phone, transaction = null } = {}) => {
  const leaderMember = await findLeaderMemberForCelula(celula, transaction);
  if (!leaderMember) return;

  const nextPhone = sanitizeCelular(phone) || null;
  const currentPhone = sanitizeCelular(leaderMember.phone) || null;
  const currentWhatsapp = sanitizeCelular(leaderMember.whatsapp) || null;

  const updates = {};
  if (currentPhone !== nextPhone) {
    updates.phone = nextPhone;
  }
  if (currentWhatsapp !== nextPhone) {
    updates.whatsapp = nextPhone;
  }

  if (Object.keys(updates).length) {
    await leaderMember.update(updates, { transaction });
  }
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
  },
  {
    model: Member,
    as: 'liderancaMemberRef',
    attributes: ['id', 'fullName', 'photoUrl']
  },
  {
    model: Member,
    as: 'pastorGeracaoMemberRef',
    attributes: ['id', 'fullName', 'photoUrl']
  },
  {
    model: Member,
    as: 'pastorCampusMemberRef',
    attributes: ['id', 'fullName', 'photoUrl']
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
  async resolveLeaderLinks(payload = {}, options = {}) {
    const transaction = options.transaction || null;

    if (Object.prototype.hasOwnProperty.call(payload, 'liderMemberId')) {
      if (!payload.liderMemberId) {
        payload.liderMemberId = null;
        payload.liderId = null;
        return payload;
      }

      const member = await Member.findByPk(payload.liderMemberId, {
        attributes: ['id', 'userId'],
        transaction
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
        attributes: ['id'],
        transaction
      });
      payload.liderMemberId = member?.id || null;
      return payload;
    }

    return payload;
  },

  /**
   * Quando o payload define liderancaMemberId mas omite PdG/PdC, busca o
   * cadastro da LA e preenche a trinca. Util para edicoes parciais (batch
   * panel, API direta) sem precisar o frontend repetir a logica.
   */
  async resolveHierarchyFromLideranca(payload = {}, options = {}) {
    const transaction = options.transaction || null;
    if (!Object.prototype.hasOwnProperty.call(payload, 'liderancaMemberId')) return payload;
    if (!payload.liderancaMemberId) return payload;

    const hasPdg = Object.prototype.hasOwnProperty.call(payload, 'pastorGeracaoMemberId');
    const hasPdc = Object.prototype.hasOwnProperty.call(payload, 'pastorCampusMemberId');
    if (hasPdg && hasPdc) return payload;

    const la = await Member.findByPk(payload.liderancaMemberId, {
      attributes: ['id', 'pastorGeracaoMemberId', 'pastorCampusMemberId'],
      transaction
    });
    if (!la) return payload;

    if (!hasPdg && la.pastorGeracaoMemberId) {
      payload.pastorGeracaoMemberId = la.pastorGeracaoMemberId;
    }
    if (!hasPdc && la.pastorCampusMemberId) {
      payload.pastorCampusMemberId = la.pastorCampusMemberId;
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
    await CelulaService.resolveHierarchyFromLideranca(payload);

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

    // Filtros por FK de membro — aceitam string ou array (multi-select)
    const fkFiltros = [
      'liderMemberId',
      'liderancaMemberId',
      'pastorGeracaoMemberId',
      'pastorCampusMemberId'
    ];
    fkFiltros.forEach((field) => {
      const value = filtros[field];
      if (!value) return;
      const ids = (Array.isArray(value) ? value : [value]).filter(Boolean);
      if (ids.length === 0) return;
      where[field] = ids.length === 1 ? ids[0] : { [Op.in]: ids };
    });
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

  async buscarCelulaPorId(id, options = {}) {
    const transaction = options.transaction || null;
    const celula = await Celula.findByPk(id, {
      include: defaultCelulaIncludes,
      transaction
    });
    if (!celula) {
      throw new Error('Célula não encontrada');
    }
    return celula;
  },

  async atualizarCelula(id, dadosAtualizados = {}) {
    const payload = { ...dadosAtualizados };
    const transaction = await Celula.sequelize.transaction();

    try {
      const celula = await CelulaService.buscarCelulaPorId(id, { transaction });

      if (payload.campus && !payload.campusId) {
        const campus = await Campus.findOne({
          where: {
            nome: {
              [Op.iLike]: `%${payload.campus}%`
            }
          },
          transaction
        });
        if (campus) {
          payload.campusId = campus.id;
        }
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'cel_lider')) {
        payload.cel_lider = sanitizeCelular(payload.cel_lider);
      }
      await CelulaService.resolveLeaderLinks(payload, { transaction });
      await CelulaService.resolveHierarchyFromLideranca(payload, { transaction });

      const updated = await celula.update(payload, { transaction });

      if (Object.prototype.hasOwnProperty.call(payload, 'cel_lider')) {
        await syncLeaderMemberPhone({
          celula: updated,
          phone: payload.cel_lider,
          transaction
        });
      }

      await transaction.commit();

      webhookEmitter.emit('celula.updated', {
        id: updated.id,
        data: payload
      });

      return updated.reload({ include: defaultCelulaIncludes });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
  },

  async buscarDuplicados() {
    const celulas = await Celula.findAll({
      where: { ativo: true },
      attributes: ['id', 'celula', 'rede', 'lider', 'email_lider', 'cel_lider', 'bairro', 'campus', 'campusId', 'lideranca', 'pastor_geracao', 'pastor_campus', 'dia', 'horario', 'endereco', 'numero', 'cep', 'cidade', 'estado', 'lat', 'lon', 'liderMemberId', 'updatedAt', 'createdAt'],
      include: [{ model: Campus, as: 'campusRef', attributes: ['id', 'nome'] }],
      order: [['celula', 'ASC']]
    });

    const normalizar = (v) => String(v || '').replace(/\D/g, '').toLowerCase();
    const normalizarTexto = (v) => String(v || '').trim().toLowerCase();

    const grupos = {};
    celulas.forEach((c) => {
      const endereco = normalizarTexto(c.endereco);
      const lider = normalizarTexto(c.lider);
      const celLider = normalizar(c.cel_lider);
      if (!endereco || !lider || !celLider) return;
      const chave = `${endereco}||${lider}||${celLider}`;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(c);
    });

    return Object.values(grupos).filter((grupo) => grupo.length > 1);
  },

  async mesclarCelulas(celulaMantenerId, celulaRemoverId) {
    const { sequelize } = Celula;
    const t = await sequelize.transaction();
    try {
      const [mantener, remover] = await Promise.all([
        CelulaService.buscarCelulaPorId(celulaMantenerId, { transaction: t }),
        CelulaService.buscarCelulaPorId(celulaRemoverId, { transaction: t })
      ]);

      const campos = ['lider', 'email_lider', 'cel_lider', 'anfitriao', 'campus', 'campusId', 'endereco', 'numero', 'cep', 'bairro', 'cidade', 'estado', 'lideranca', 'pastor_geracao', 'pastor_campus', 'dia', 'horario', 'lat', 'lon', 'liderMemberId'];
      const updates = {};
      campos.forEach((campo) => {
        const valAtual = mantener[campo];
        const valRemover = remover[campo];
        const vazio = (v) => v === null || v === undefined || v === '';
        if (vazio(valAtual) && !vazio(valRemover)) {
          updates[campo] = valRemover;
        }
      });

      if (Object.keys(updates).length) {
        await mantener.update(updates, { transaction: t });
      }

      const totalMovidos = await ApeloDirecionadoCelula.update(
        { celula_id: celulaMantenerId },
        { where: { celula_id: celulaRemoverId }, transaction: t }
      );

      await remover.destroy({ transaction: t });
      await t.commit();

      return {
        mensagem: 'Células unificadas com sucesso.',
        direcionamentosMovidos: totalMovidos[0],
        camposAtualizados: Object.keys(updates)
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

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
        'baptismDate',
        'cpf',
        'maritalStatus',
        'status',
        'street',
        'neighborhood',
        'number',
        'zipCode',
        'city',
        'state',
        'photoUrl',
        'notes',
        'spouseMemberId',
        'campusId'
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
            'zipCode',
            'city',
            'state',
            'userId'
          ],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'profissao', 'estado_civil']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'profissao',
            'batizado',
            'encontro',
            'escolas',
            'escolaridade',
            'estado_civil',
            'nome_esposo',
            'perfilId'
          ]
        }
      ]
    });

    return leader;
  },

  /**
   * Lista celulas com texto legado em "lideranca" e sem liderancaMemberId,
   * sugerindo matches por primeiro nome com membros que tem cargo
   * lideranca_apostolica.
   */
  async listarCelulasComLiderancaLegada({ limit = 500 } = {}) {
    const celulas = await Celula.findAll({
      where: {
        ativo: true,
        liderancaMemberId: null,
        lideranca: { [Op.ne]: null, [Op.ne]: '' }
      },
      attributes: [
        'id', 'celula', 'rede', 'lider', 'liderMemberId',
        'lideranca', 'pastor_geracao', 'pastor_campus',
        'liderancaMemberId', 'pastorGeracaoMemberId', 'pastorCampusMemberId',
        'campus', 'bairro'
      ],
      order: [['celula', 'ASC']],
      limit
    });

    const liderancasApostolicas = await Member.findAll({
      attributes: ['id', 'fullName', 'pastorGeracaoMemberId', 'pastorCampusMemberId'],
      include: [{
        model: MemberCargo,
        as: 'cargos',
        where: { cargo: 'lideranca_apostolica', ativo: true },
        attributes: [],
        required: true
      }],
      order: [['fullName', 'ASC']]
    });

    const candidatos = liderancasApostolicas.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      pastorGeracaoMemberId: m.pastorGeracaoMemberId,
      pastorCampusMemberId: m.pastorCampusMemberId
    }));

    return celulas.map((c) => {
      const matches = topMatches(c.lideranca, candidatos, { limit: 5, minScore: 0.6 });
      return {
        celulaId: c.id,
        celulaNome: c.celula,
        rede: c.rede,
        campus: c.campus,
        bairro: c.bairro,
        lider: c.lider,
        liderMemberId: c.liderMemberId,
        textoLideranca: c.lideranca,
        textoPastorGeracao: c.pastor_geracao,
        textoPastorCampus: c.pastor_campus,
        matches
      };
    });
  },

  /**
   * Aplica em lote a vinculacao de Lideranca Apostolica nas celulas.
   * Items: [{ celulaId, liderancaMemberId }]
   * O resolveHierarchyFromLideranca dentro de atualizarCelula puxa PdG/PdC.
   */
  async aplicarLiderancaEmLote(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
      return { atualizadas: 0, erros: [] };
    }
    let atualizadas = 0;
    const erros = [];

    for (const item of items) {
      try {
        if (!item || !item.celulaId || !item.liderancaMemberId) {
          erros.push({ celulaId: item?.celulaId, erro: 'celulaId e liderancaMemberId sao obrigatorios' });
          continue;
        }
        await CelulaService.atualizarCelula(item.celulaId, {
          liderancaMemberId: item.liderancaMemberId
        });
        atualizadas += 1;
      } catch (err) {
        erros.push({ celulaId: item.celulaId, erro: err.message });
      }
    }

    return { atualizadas, erros };
  }
};

module.exports = CelulaService;
