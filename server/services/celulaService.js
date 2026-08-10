const { Op, literal } = require('sequelize');
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
  },
  {
    model: Celula,
    as: 'casalRef',
    attributes: ['id', 'celula', 'rede', 'lider', 'dia', 'horario']
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

    // Células cujo líder não está vinculado a um membro (liderMemberId nulo).
    if (['true', '1', 'yes', 'on'].includes(String(filtros.semLiderMembro || '').toLowerCase().trim())) {
      where.liderMemberId = null;
    }

    // Apenas células de casal (vinculadas a outra célula).
    if (['true', '1', 'yes', 'on'].includes(String(filtros.casal || '').toLowerCase().trim())) {
      where.casalCelulaId = { [Op.ne]: null };
    }

    // Células criadas nos últimos N dias (ex.: novasDias=7).
    if (filtros.novasDias) {
      const dias = parseInt(filtros.novasDias, 10);
      if (Number.isFinite(dias) && dias > 0) {
        const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
        where.createdAt = { [Op.gte]: desde };
      }
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

    const normDigits = (v) => String(v || '').replace(/\D/g, '');
    const normText = (v) => String(v || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    // Chave por logradouro (sem número): tolera número inconsistente/ausente,
    // já que isso é apenas um sinal para revisão manual.
    const enderecoKey = (c) => normText(c.endereco);

    // Cada "sinal" liga células que provavelmente são a mesma. Todos exigem o
    // mesmo endereço; variamos o segundo critério para pegar mais casos.
    const sinais = new Map();
    const addSinal = (chave, id) => {
      if (!sinais.has(chave)) sinais.set(chave, []);
      sinais.get(chave).push(id);
    };
    celulas.forEach((c) => {
      const end = enderecoKey(c);
      if (!end) return;
      // 1) mesmo líder vinculado (membro) + mesmo endereço
      if (c.liderMemberId) addSinal(`L|${c.liderMemberId}|${end}`, c.id);
      // 2) mesmo endereço + mesmo nome de líder (texto) + mesmo celular
      const lider = normText(c.lider);
      const cel = normDigits(c.cel_lider);
      if (lider && cel) addSinal(`T|${end}|${lider}|${cel}`, c.id);
    });

    // Union-find: une células que compartilham qualquer sinal (transitividade).
    const parent = new Map();
    celulas.forEach((c) => parent.set(c.id, c.id));
    const find = (x) => {
      let raiz = x;
      while (parent.get(raiz) !== raiz) raiz = parent.get(raiz);
      let atual = x;
      while (parent.get(atual) !== raiz) {
        const prox = parent.get(atual);
        parent.set(atual, raiz);
        atual = prox;
      }
      return raiz;
    };
    const union = (a, b) => { parent.set(find(a), find(b)); };
    sinais.forEach((ids) => {
      for (let i = 1; i < ids.length; i += 1) union(ids[0], ids[i]);
    });

    const byId = new Map(celulas.map((c) => [c.id, c]));
    const porRaiz = new Map();
    celulas.forEach((c) => {
      const raiz = find(c.id);
      if (!porRaiz.has(raiz)) porRaiz.set(raiz, []);
      porRaiz.get(raiz).push(byId.get(c.id));
    });

    return [...porRaiz.values()]
      .filter((grupo) => grupo.length > 1)
      // Dentro do grupo, a mais antiga primeiro (candidata natural a manter).
      .map((grupo) => grupo.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
      .sort((a, b) => b.length - a.length);
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

      // Reatribui todas as tabelas filhas que referenciam a célula removida para
      // a célula mantida. Sem isso o DELETE viola FKs (Members, MemberActivities)
      // ou apaga dados em cascata (vínculos, reuniões, presenças).
      const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';
      const reatribuicoes = [
        `UPDATE "${SCHEMA}"."Members" SET "celulaId" = :mantener WHERE "celulaId" = :remover`,
        `UPDATE "${SCHEMA}"."MemberActivities" SET "celulaId" = :mantener WHERE "celulaId" = :remover`,
        // Índice único parcial (celulaId, membroId) WHERE ativo=true: remove os
        // vínculos ativos da removida cujo membro já está ativo na mantida.
        `DELETE FROM "${SCHEMA}"."CelulaMembroVinculos" v
           WHERE v."celulaId" = :remover AND v.ativo = true
             AND EXISTS (SELECT 1 FROM "${SCHEMA}"."CelulaMembroVinculos" v2
                         WHERE v2."celulaId" = :mantener AND v2."membroId" = v."membroId" AND v2.ativo = true)`,
        `UPDATE "${SCHEMA}"."CelulaMembroVinculos" SET "celulaId" = :mantener WHERE "celulaId" = :remover`,
        // Índice único (celulaId, data): remove as reuniões da removida cuja data
        // já existe na mantida (presenças filhas caem em cascata) antes de reatribuir.
        `DELETE FROM "${SCHEMA}"."CelulaReunioes" r
           WHERE r."celulaId" = :remover
             AND EXISTS (SELECT 1 FROM "${SCHEMA}"."CelulaReunioes" r2
                         WHERE r2."celulaId" = :mantener AND r2.data = r.data)`,
        `UPDATE "${SCHEMA}"."CelulaReunioes" SET "celulaId" = :mantener WHERE "celulaId" = :remover`,
        `UPDATE "${SCHEMA}"."PreCadastroPresencas" SET "celulaId" = :mantener WHERE "celulaId" = :remover`,
        `UPDATE "${SCHEMA}"."apelos_direcionados_historico" SET "celula_id_destino" = :mantener WHERE "celula_id_destino" = :remover`,
        `UPDATE "${SCHEMA}"."apelos_direcionados_historico" SET "celula_id_origem" = :mantener WHERE "celula_id_origem" = :remover`,
        // Vínculo de casal é auto-referência sem FK no banco: desfaz refs pendentes.
        `UPDATE "${SCHEMA}"."celulas" SET "casalCelulaId" = NULL WHERE "casalCelulaId" = :remover`
      ];
      for (const sql of reatribuicoes) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(sql, {
          replacements: { mantener: celulaMantenerId, remover: celulaRemoverId },
          transaction: t
        });
      }

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
      // Compara dígitos puros (remove ddd/55/parênteses/hífens dos 2 lados)
      // e usa LIKE com últimos 11 dígitos pra ser tolerante a 55 do código do país.
      if (sanitizedPhone && /^\d+$/.test(sanitizedPhone)) {
        const last11 = sanitizedPhone.slice(-11);
        clauses.push(
          literal(`regexp_replace(COALESCE("Member"."phone", ''), '\\D', '', 'g') LIKE '%${last11}'`)
        );
        clauses.push(
          literal(`regexp_replace(COALESCE("Member"."whatsapp", ''), '\\D', '', 'g') LIKE '%${last11}'`)
        );
      }
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
        'campusId',
        'liderancaApostolicaMemberId',
        'pastorGeracaoMemberId',
        'pastorCampusMemberId'
      ],
      include: [
        {
          model: Celula,
          as: 'liderancaCelulas',
          include: celulaForLeaderSearchIncludes
        },
        {
          model: Member,
          as: 'liderancaApostolica',
          attributes: ['id', 'fullName']
        },
        {
          model: Member,
          as: 'pastorGeracao',
          attributes: ['id', 'fullName']
        },
        {
          model: Member,
          as: 'pastorCampus',
          attributes: ['id', 'fullName']
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

    const linhas = celulas.map((c) => {
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

    // Lista completa de Lideranças Apostólicas para seleção manual quando não
    // houver match automático.
    const liderancas = candidatos.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      pastorGeracaoMemberId: m.pastorGeracaoMemberId,
      pastorCampusMemberId: m.pastorCampusMemberId
    }));

    return { celulas: linhas, liderancas };
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
  },

  /**
   * Sugere pares de célula de casal cruzando redes de "mesmo público" em pares
   * feminino×masculino: Mulheres IECG × Homens IECG e Juventude Relevante
   * Moças × Rapazes. Células com o MESMO endereço + número são candidatas.
   * Marca também se dia e horário coincidem (score de confiança).
   * Considera apenas células ativas e ainda não vinculadas como casal.
   */
  async sugerirCasais() {
    const norm = (v) => String(v || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    // Normaliza o conjunto de dias (ignora ordem): "Quarta, Segunda" == "Segunda, Quarta"
    const normDias = (v) => norm(v)
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
      .sort()
      .join(',');

    const attrs = [
      'id', 'celula', 'rede', 'lider', 'email_lider', 'cel_lider',
      'endereco', 'numero', 'bairro', 'cidade', 'dia', 'horario',
      'campus', 'casalCelulaId'
    ];

    // Pares de redes (lado feminino × lado masculino) que formam célula de casal.
    const PARES_REDE = [
      { fem: 'MULHERES IECG', masc: 'HOMENS IECG' },
      { fem: 'JUVENTUDE RELEVANTE MOÇAS', masc: 'JUVENTUDE RELEVANTE RAPAZES' }
    ];

    const buscarPorRede = (redeLike) => Celula.findAll({
      where: {
        ativo: true,
        casalCelulaId: null,
        rede: { [Op.iLike]: `%${redeLike}%` }
      },
      attributes: attrs,
      order: [['celula', 'ASC']]
    });

    // Só é possível parear quando há endereço; a chave é endereço + número.
    const enderecoKey = (c) => {
      const e = norm(c.endereco);
      if (!e) return null;
      return `${e}|${norm(c.numero)}`;
    };

    const toDto = (c) => ({
      id: c.id,
      celula: c.celula,
      rede: c.rede,
      lider: c.lider,
      endereco: c.endereco,
      numero: c.numero,
      bairro: c.bairro,
      cidade: c.cidade,
      dia: c.dia,
      horario: c.horario,
      campus: c.campus
    });

    // Busca as células de todos os pares em paralelo (sem await em loop).
    const resultadosPorPar = await Promise.all(
      PARES_REDE.map(async (par) => {
        const [fem, masc] = await Promise.all([
          buscarPorRede(par.fem),
          buscarPorRede(par.masc)
        ]);
        return { par, fem, masc };
      })
    );

    const sugestoes = [];
    resultadosPorPar.forEach(({ par, fem, masc }) => {
      const mascPorEndereco = new Map();
      masc.forEach((h) => {
        const chave = enderecoKey(h);
        if (!chave) return;
        if (!mascPorEndereco.has(chave)) mascPorEndereco.set(chave, []);
        mascPorEndereco.get(chave).push(h);
      });

      fem.forEach((m) => {
        const chave = enderecoKey(m);
        if (!chave) return;
        const candidatos = mascPorEndereco.get(chave) || [];
        candidatos.forEach((h) => {
          const diaM = normDias(m.dia);
          const diaMatch = Boolean(diaM) && diaM === normDias(h.dia);
          const horM = norm(m.horario);
          const horarioMatch = Boolean(horM) && horM === norm(h.horario);
          // Endereço sempre bate (é a chave). Confiança sobe com dia e horário.
          const score = (1 + (diaMatch ? 1 : 0) + (horarioMatch ? 1 : 0)) / 3;
          sugestoes.push({
            id: `${m.id}::${h.id}`,
            parRede: `${par.fem} × ${par.masc}`,
            mulheres: toDto(m),
            homens: toDto(h),
            enderecoMatch: true,
            diaMatch,
            horarioMatch,
            score
          });
        });
      });
    });

    // Melhores primeiro (endereço+dia+horário no topo).
    sugestoes.sort((a, b) => b.score - a.score);
    return sugestoes;
  },

  /**
   * Vincula em lote pares de célula de casal, gravando casalCelulaId nos dois
   * lados (1:1 bidirecional) dentro de uma transação por par.
   * Items: [{ celulaMulheresId, celulaHomensId }]
   */
  async vincularCasaisEmLote(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
      return { vinculadas: 0, erros: [] };
    }
    let vinculadas = 0;
    const erros = [];

    for (const item of items) {
      const { celulaMulheresId, celulaHomensId } = item || {};
      const t = await Celula.sequelize.transaction();
      try {
        if (!celulaMulheresId || !celulaHomensId) {
          erros.push({ item, erro: 'celulaMulheresId e celulaHomensId sao obrigatorios' });
          await t.rollback();
          continue;
        }
        if (celulaMulheresId === celulaHomensId) {
          erros.push({ item, erro: 'As celulas devem ser diferentes' });
          await t.rollback();
          continue;
        }

        const [m, h] = await Promise.all([
          Celula.findByPk(celulaMulheresId, { transaction: t }),
          Celula.findByPk(celulaHomensId, { transaction: t })
        ]);

        if (!m || !h) {
          erros.push({ item, erro: 'Celula nao encontrada' });
          await t.rollback();
          continue;
        }

        await m.update({ casalCelulaId: h.id }, { transaction: t });
        await h.update({ casalCelulaId: m.id }, { transaction: t });
        await t.commit();
        vinculadas += 1;

        webhookEmitter.emit('celula.updated', { id: m.id, data: { casalCelulaId: h.id } });
        webhookEmitter.emit('celula.updated', { id: h.id, data: { casalCelulaId: m.id } });
      } catch (err) {
        await t.rollback();
        erros.push({ item, erro: err.message });
      }
    }

    return { vinculadas, erros };
  },

  /**
   * Remove o vínculo de casal dos dois lados (a célula informada e o seu par).
   */
  async desvincularCasal(celulaId) {
    if (!celulaId) throw new Error('celulaId é obrigatório');
    const t = await Celula.sequelize.transaction();
    try {
      const celula = await Celula.findByPk(celulaId, { transaction: t });
      if (!celula) {
        await t.rollback();
        throw new Error('Célula não encontrada');
      }
      const parId = celula.casalCelulaId;
      await celula.update({ casalCelulaId: null }, { transaction: t });

      if (parId) {
        const par = await Celula.findByPk(parId, { transaction: t });
        if (par && par.casalCelulaId === celula.id) {
          await par.update({ casalCelulaId: null }, { transaction: t });
        }
      }

      await t.commit();

      webhookEmitter.emit('celula.updated', { id: celula.id, data: { casalCelulaId: null } });
      if (parId) {
        webhookEmitter.emit('celula.updated', { id: parId, data: { casalCelulaId: null } });
      }

      return { mensagem: 'Vínculo de casal removido com sucesso.' };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
};

module.exports = CelulaService;
