/* eslint-disable class-methods-use-this */
const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize,
  Member,
  MemberJourney,
  MemberActivity,
  MemberActivityType,
  MemberMilestone,
  MIA,
  User,
  Campus,
  Celula
} = require('../models');
const cache = require('../utils/cache');

const DEFAULT_MEMBER_PERFIL_ID = process.env.DEFAULT_MEMBER_PERFIL_ID || '7d47d03a-a7aa-4907-b8b9-8fcf87bd52dc';
const ALLOWED_GENDERS = ['MASCULINO', 'FEMININO'];
const JOURNEY_STAGES = [
  'VISITANTE',
  'FREQUENTADOR',
  'CONGREGADO',
  'MEMBRO',
  'DISCIPULO',
  'LIDER_EM_FORMACAO',
  'LIDER_ATIVO',
  'MULTIPLICADOR',
  'MIA'
];
const HEALTH_STATUSES = ['SAUDAVEL', 'ATENCAO', 'CRITICO', 'MIA'];
const MILESTONE_TYPES = [
  'PRIMEIRA_VISITA',
  'DECISAO_FE',
  'BATISMO',
  'MEMBRO_OFICIAL',
  'PRIMEIRA_CELULA',
  'LIDER_CELULA',
  'VOLUNTARIO_MINISTERIO',
  'LIDER_MINISTERIO',
  'CURSO_CONCLUIDO',
  'DIZIMISTA_FIEL',
  'CASAMENTO',
  'DEDICACAO_FILHO',
  'ANIVERSARIO_CONVERSAO'
];
const ACTIVITY_CODE_REGEX = /^[A-Z0-9_]+$/;

const sanitizePhone = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits || null;
};

const hashSHA256WithSalt = (password, salt) => crypto.createHmac('sha256', salt).update(password).digest('hex');

const buildUsername = (fullName, email) => {
  if (email && email.includes('@')) {
    return email.split('@')[0].toLowerCase();
  }
  const base = (fullName || 'membro').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base || 'membro'}-${Date.now()}`;
};

class MemberService {
  normalizeActivityTypeCode(value) {
    if (!value) return '';
    return String(value)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  clampScore(value) {
    const score = Number.isFinite(Number(value)) ? Number(value) : 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  validateGender(gender) {
    if (!gender) return;
    if (!ALLOWED_GENDERS.includes(gender)) {
      throw new Error('Genero invalido. Use apenas MASCULINO ou FEMININO');
    }
  }

  validateJourneyStage(stage) {
    if (!stage) return;
    if (!JOURNEY_STAGES.includes(stage)) {
      throw new Error('Estagio de jornada invalido');
    }
  }

  validateHealthStatus(status) {
    if (!status) return;
    if (!HEALTH_STATUSES.includes(status)) {
      throw new Error('Status de saude invalido');
    }
  }

  normalizeSpousePayload(payload = {}, currentMaritalStatus = null) {
    const nextPayload = { ...payload };
    const effectiveMaritalStatus = Object.prototype.hasOwnProperty.call(nextPayload, 'maritalStatus')
      ? nextPayload.maritalStatus
      : currentMaritalStatus;

    if (effectiveMaritalStatus !== 'CASADO') {
      nextPayload.spouseMemberId = null;
    }

    return nextPayload;
  }

  getMemberDetailInclude() {
    return [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'perfilId', 'active'] },
      { model: Campus, as: 'campus' },
      { model: Celula, as: 'celula' },
      {
        model: Celula,
        as: 'liderancaCelulas',
        attributes: [
          'id',
          'celula',
          'rede',
          'bairro',
          'dia',
          'horario',
          'ativo',
          'campusId'
        ],
        include: [
          {
            model: Campus,
            as: 'campusRef',
            attributes: ['id', 'nome']
          }
        ]
      },
      {
        model: Member,
        as: 'spouse',
        attributes: ['id', 'fullName', 'preferredName', 'photoUrl', 'status', 'userId']
      },
      {
        model: MemberJourney,
        as: 'journey'
      },
      {
        model: MemberActivity,
        as: 'activities',
        limit: 50,
        order: [['activityDate', 'DESC']],
        include: [
          {
            model: MemberActivityType,
            as: 'activityTypeRef',
            attributes: ['id', 'code', 'name', 'category'],
            required: false
          }
        ]
      },
      {
        model: MemberMilestone,
        as: 'milestones',
        order: [['achievedDate', 'DESC']]
      },
      {
        model: MIA,
        as: 'miaRecord',
        include: [
          { model: User, as: 'responsiblePastor', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'responsibleLeader', attributes: ['id', 'name', 'email'] }
        ]
      }
    ];
  }

  async getMemberWithDetails(where = {}) {
    const member = await Member.findOne({
      where,
      include: this.getMemberDetailInclude()
    });

    if (!member) {
      throw new Error('Membro nao encontrado');
    }

    const updatedJourney = await this.recalculateJourneyFromActivities(member.id, {
      member,
      journey: member.journey || undefined
    });
    if (!member.journey) {
      member.setDataValue('journey', updatedJourney);
    }

    await this.enrichMemberTimelineLabels(member);

    return member;
  }

  async enrichMemberTimelineLabels(member) {
    if (!member) return;

    const activities = Array.isArray(member.activities) ? member.activities : [];
    const milestones = Array.isArray(member.milestones) ? member.milestones : [];

    const codes = Array.from(new Set([
      ...activities.map((activity) => activity?.activityType).filter(Boolean),
      ...milestones.map((milestone) => milestone?.milestoneType).filter(Boolean)
    ]));

    if (!codes.length) return;

    const refs = await MemberActivityType.findAll({
      where: {
        code: {
          [Op.in]: codes
        }
      },
      attributes: ['code', 'name']
    });

    const namesByCode = refs.reduce((acc, item) => {
      acc[item.code] = item.name || item.code;
      return acc;
    }, {});

    activities.forEach((activity) => {
      const fallback = activity?.activityTypeRef?.name || activity?.activityType;
      if (typeof activity?.setDataValue === 'function') {
        activity.setDataValue('displayLabel', namesByCode[activity.activityType] || fallback || activity.activityType);
      }
    });

    milestones.forEach((milestone) => {
      const fallback = milestone?.milestoneType;
      if (typeof milestone?.setDataValue === 'function') {
        milestone.setDataValue('displayLabel', namesByCode[milestone.milestoneType] || fallback);
      }
    });
  }

  async syncLinkedUserFromMember(userId, payload = {}, transaction = null) {
    if (!userId) return;

    const user = await User.findByPk(userId, { transaction });
    if (!user) return;

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'fullName')) {
      updates.name = payload.fullName || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
      updates.email = payload.email || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'photoUrl')) {
      updates.image = payload.photoUrl || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'birthDate')) {
      updates.data_nascimento = payload.birthDate || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'street')) {
      updates.endereco = payload.street || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'neighborhood')) {
      updates.bairro = payload.neighborhood || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'number')) {
      updates.numero = payload.number || null;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'zipCode')) {
      updates.cep = payload.zipCode || null;
    }
    if (
      Object.prototype.hasOwnProperty.call(payload, 'phone')
      || Object.prototype.hasOwnProperty.call(payload, 'whatsapp')
    ) {
      updates.telefone = sanitizePhone(payload.phone || payload.whatsapp) || null;
    }

    if (Object.keys(updates).length) {
      await user.update(updates, { transaction });
    }
  }

  async ensureBaptismMilestone(memberId, baptismDate, createdBy = null, transaction = null) {
    return this.ensureDatedMilestone(
      memberId,
      'BATISMO',
      baptismDate,
      'Batismo nas aguas',
      createdBy,
      transaction
    );
  }

  async ensureConversionMilestone(memberId, conversionDate, createdBy = null, transaction = null) {
    return this.ensureDatedMilestone(
      memberId,
      'DECISAO_FE',
      conversionDate,
      'Apelo registrado',
      createdBy,
      transaction
    );
  }

  async ensureDatedMilestone(memberId, milestoneType, dateValue, description, createdBy = null, transaction = null) {
    if (!memberId || !dateValue) {
      return null;
    }

    const achievedDate = String(dateValue).slice(0, 10);
    const milestone = await MemberMilestone.findOne({
      where: {
        memberId,
        milestoneType
      },
      transaction
    });

    if (milestone) {
      const nextValues = {};
      if (String(milestone.achievedDate) !== achievedDate) {
        nextValues.achievedDate = achievedDate;
      }
      if (description && milestone.description !== description) {
        nextValues.description = description;
      }
      if (Object.keys(nextValues).length) {
        await milestone.update(nextValues, { transaction });
      }
      return milestone;
    }

    return MemberMilestone.create({
      memberId,
      milestoneType,
      achievedDate,
      description: description || null,
      createdBy
    }, { transaction });
  }

  async resolveMilestoneType(data = {}) {
    const hasTypeId = Boolean(data.milestoneTypeId);
    const normalizedCode = this.normalizeActivityTypeCode(data.milestoneType);

    if (!hasTypeId && !normalizedCode) {
      throw new Error('Informe milestoneType ou milestoneTypeId');
    }

    let milestoneTypeRef = null;

    if (hasTypeId) {
      milestoneTypeRef = await MemberActivityType.findByPk(data.milestoneTypeId);
      if (!milestoneTypeRef) {
        throw new Error('Tipo de marco nao encontrado');
      }

      if (normalizedCode && normalizedCode !== milestoneTypeRef.code) {
        throw new Error('milestoneType e milestoneTypeId informam tipos diferentes');
      }
    } else {
      milestoneTypeRef = await MemberActivityType.findOne({ where: { code: normalizedCode } });
    }

    if (milestoneTypeRef) {
      const category = String(milestoneTypeRef.category || '').trim().toUpperCase();
      if (category !== 'MARCOS') {
        throw new Error('Tipo informado nao pertence a categoria MARCOS');
      }

      if (!milestoneTypeRef.isActive) {
        throw new Error('Tipo de marco inativo');
      }

      return milestoneTypeRef.code;
    }

    if (normalizedCode && MILESTONE_TYPES.includes(normalizedCode)) {
      return normalizedCode;
    }

    throw new Error('Tipo de marco nao cadastrado');
  }

  async ensureJourney(memberId) {
    let journey = await MemberJourney.findOne({ where: { memberId } });
    if (!journey) {
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }
      journey = await MemberJourney.create({
        memberId,
        currentStage: this.mapStatusToStage(member.status),
        stageChangedAt: new Date(),
        lastActivityDate: new Date()
      });
    }
    return journey;
  }

  async resolveActivityType(data = {}) {
    const hasTypeId = Boolean(data.activityTypeId);
    const normalizedCode = this.normalizeActivityTypeCode(data.activityType);

    if (!hasTypeId && !normalizedCode) {
      throw new Error('Informe activityType ou activityTypeId');
    }

    let activityType = null;

    if (hasTypeId) {
      activityType = await MemberActivityType.findByPk(data.activityTypeId);
      if (!activityType) {
        throw new Error('Tipo de atividade nao encontrado');
      }

      if (normalizedCode && normalizedCode !== activityType.code) {
        throw new Error('activityType e activityTypeId informam tipos diferentes');
      }
    } else {
      activityType = await MemberActivityType.findOne({ where: { code: normalizedCode } });
    }

    if (!activityType) {
      throw new Error('Tipo de atividade nao cadastrado');
    }

    if (!activityType.isActive) {
      throw new Error('Tipo de atividade inativo');
    }

    return activityType;
  }

  resolveActivityCategory(activity) {
    const categoryFromType = String(activity?.activityTypeRef?.category || '').trim().toUpperCase();
    if (categoryFromType) {
      return categoryFromType;
    }

    const code = String(activity?.activityType || '').trim().toUpperCase();
    if (code.includes('CELULA')) return 'COMUNIDADE';
    if (code.includes('ESCOLA') || code.includes('CURSO')) return 'DISCIPULADO';
    if (code.includes('EVENTO')) return 'EVENTOS';
    return 'OUTRO';
  }

  calculateJourneyMetrics(activities = [], memberStatus = null, fallbackLastActivityDate = null) {
    const now = new Date();
    const cutoff7 = new Date(now);
    cutoff7.setDate(cutoff7.getDate() - 7);
    const cutoff30 = new Date(now);
    cutoff30.setDate(cutoff30.getDate() - 30);
    const cutoff120 = new Date(now);
    cutoff120.setDate(cutoff120.getDate() - 120);
    const cutoff270 = new Date(now);
    cutoff270.setDate(cutoff270.getDate() - 270);

    const sortedActivities = [...activities]
      .filter((activity) => activity?.activityDate)
      .sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate));

    const latestActivityDate = sortedActivities[0]?.activityDate
      ? new Date(sortedActivities[0].activityDate)
      : (fallbackLastActivityDate ? new Date(fallbackLastActivityDate) : null);

    const hasValidLastActivityDate = latestActivityDate && !Number.isNaN(latestActivityDate.getTime());
    const daysInactive = hasValidLastActivityDate
      ? Math.max(0, Math.floor((now - latestActivityDate) / (1000 * 60 * 60 * 24)))
      : 0;

    let pointsRecentPeriod = 0;
    let hasCellActivity = false;
    let hasSchoolActivity = false;
    let hasEventActivity = false;

    sortedActivities.forEach((activity) => {
      const activityDate = new Date(activity.activityDate);
      if (Number.isNaN(activityDate.getTime())) {
        return;
      }

      const category = this.resolveActivityCategory(activity);
      const points = Number(activity.points) || 0;

      if (activityDate >= cutoff120) {
        pointsRecentPeriod += points;
      }

      if (!hasCellActivity && category === 'COMUNIDADE' && activityDate >= cutoff7) {
        hasCellActivity = true;
      }
      if (!hasSchoolActivity && category === 'DISCIPULADO') {
        const activityCode = String(activity?.activityType || '').toUpperCase();
        const schoolWindowStart = activityCode.includes('ESCOLA_FUNDAMENTOS')
          ? cutoff270
          : cutoff120;
        if (activityDate >= schoolWindowStart) {
          hasSchoolActivity = true;
        }
      }
      if (!hasEventActivity && category === 'EVENTOS' && activityDate >= cutoff120) {
        hasEventActivity = true;
      }
    });

    const hasAnyRecentActivity = hasValidLastActivityDate && latestActivityDate >= cutoff30;
    const baseScoreFromPoints = Math.max(0, Math.min(40, Math.round(pointsRecentPeriod / 5)));

    let engagementScore = baseScoreFromPoints
      + (hasCellActivity ? 20 : 0)
      + (hasSchoolActivity ? 20 : 0)
      + (hasEventActivity ? 20 : 0)
      + (hasAnyRecentActivity ? 10 : 0);

    if (daysInactive > 30) {
      engagementScore -= Math.min(40, Math.round((daysInactive - 30) / 3));
    }

    engagementScore = this.clampScore(engagementScore);

    let healthStatus = 'SAUDAVEL';
    if (memberStatus === 'MIA') {
      healthStatus = 'MIA';
    } else if (daysInactive > 60 || engagementScore < 25) {
      healthStatus = 'CRITICO';
    } else if (daysInactive > 30 || engagementScore < 50) {
      healthStatus = 'ATENCAO';
    }

    return {
      engagementScore,
      daysInactive,
      lastActivityDate: hasValidLastActivityDate ? latestActivityDate : null,
      healthStatus,
      indicators: {
        celula: hasCellActivity,
        escola: hasSchoolActivity,
        eventos: hasEventActivity
      }
    };
  }

  async recalculateJourneyFromActivities(memberId, options = {}) {
    const member = options.member || await Member.findByPk(memberId, { attributes: ['id', 'status'] });
    if (!member) {
      throw new Error('Membro nao encontrado');
    }

    const journey = options.journey || await this.ensureJourney(memberId);
    const activities = await MemberActivity.findAll({
      where: { memberId },
      include: [
        {
          model: MemberActivityType,
          as: 'activityTypeRef',
          attributes: ['id', 'code', 'category'],
          required: false
        }
      ],
      attributes: ['id', 'activityType', 'activityDate', 'points']
    });

    const metrics = this.calculateJourneyMetrics(activities, member.status, journey.lastActivityDate);

    await journey.update({
      engagementScore: metrics.engagementScore,
      daysInactive: metrics.daysInactive,
      lastActivityDate: metrics.lastActivityDate,
      healthStatus: metrics.healthStatus
    });

    journey.setDataValue('engagementIndicators', metrics.indicators);
    return journey;
  }

  async validateSpouseMember(spouseMemberId, memberId = null) {
    if (!spouseMemberId) return null;
    if (memberId && spouseMemberId === memberId) {
      throw new Error('Nao e possivel vincular o proprio membro como conjuge');
    }

    const spouse = await Member.findByPk(spouseMemberId);
    if (!spouse) {
      throw new Error('Conjuge informado nao foi encontrado');
    }
    return spouse;
  }

  async syncSpouseLink(memberId, spouseMemberId, previousSpouseMemberId = undefined) {
    const member = await Member.findByPk(memberId);
    if (!member) return;

    const currentSpouseId = typeof previousSpouseMemberId === 'undefined'
      ? (member.spouseMemberId || null)
      : (previousSpouseMemberId || null);
    const nextSpouseId = spouseMemberId || null;

    if (currentSpouseId === nextSpouseId) {
      if (nextSpouseId) {
        const currentSpouse = await Member.findByPk(nextSpouseId);
        if (currentSpouse && currentSpouse.spouseMemberId !== member.id) {
          await currentSpouse.update({ spouseMemberId: member.id });
        }
      }
      return;
    }

    if (currentSpouseId) {
      const oldSpouse = await Member.findByPk(currentSpouseId);
      if (oldSpouse && oldSpouse.spouseMemberId === member.id) {
        await oldSpouse.update({ spouseMemberId: null });
      }
    }

    if (!nextSpouseId) {
      if (member.spouseMemberId !== null) {
        await member.update({ spouseMemberId: null });
      }
      return;
    }

    const nextSpouse = await this.validateSpouseMember(nextSpouseId, member.id);

    if (nextSpouse.spouseMemberId && nextSpouse.spouseMemberId !== member.id) {
      const previousOfNext = await Member.findByPk(nextSpouse.spouseMemberId);
      if (previousOfNext && previousOfNext.spouseMemberId === nextSpouse.id) {
        await previousOfNext.update({ spouseMemberId: null });
      }
    }

    if (member.spouseMemberId !== nextSpouse.id) {
      await member.update({ spouseMemberId: nextSpouse.id });
    }
    if (nextSpouse.spouseMemberId !== member.id) {
      await nextSpouse.update({ spouseMemberId: member.id });
    }
  }

  async listSpouseCandidatesByUserId(userId) {
    if (!userId) {
      throw new Error('Usuario autenticado nao informado');
    }

    const member = await Member.findOne({
      where: { userId },
      attributes: ['id']
    });
    if (!member) {
      throw new Error('Membro nao encontrado');
    }

    const candidates = await Member.findAll({
      where: {
        id: { [Op.ne]: member.id },
        [Op.or]: [
          { spouseMemberId: null },
          { spouseMemberId: member.id }
        ]
      },
      attributes: ['id', 'fullName', 'preferredName', 'photoUrl', 'status', 'userId'],
      order: [['fullName', 'ASC']]
    });

    return candidates.map((candidate) => ({
      id: candidate.id,
      fullName: candidate.fullName,
      preferredName: candidate.preferredName || null,
      photoUrl: candidate.photoUrl || null,
      status: candidate.status || null,
      userId: candidate.userId || null,
      hasLinkedUser: Boolean(candidate.userId)
    }));
  }

  /**
   * Criar novo membro
   */
  async createMember(data, createdBy) {
    try {
      const payload = this.normalizeSpousePayload(data);
      this.validateGender(payload.gender);
      const transaction = await sequelize.transaction();
      let member;

      try {
        const salt = crypto.randomBytes(16).toString('hex');
        const defaultPassword = (payload.cpf || '').replace(/\D/g, '') || crypto.randomBytes(8).toString('hex');
        const passwordHash = hashSHA256WithSalt(defaultPassword, salt);

        const user = await User.create({
          name: payload.fullName,
          email: payload.email || null,
          telefone: sanitizePhone(payload.phone || payload.whatsapp),
          image: payload.photoUrl || null,
          username: buildUsername(payload.fullName, payload.email),
          cpf: payload.cpf || null,
          data_nascimento: payload.birthDate || null,
          endereco: payload.street || null,
          bairro: payload.neighborhood || null,
          numero: payload.number || null,
          cep: payload.zipCode || null,
          active: !['INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'].includes(payload.status || 'MEMBRO'),
          perfilId: DEFAULT_MEMBER_PERFIL_ID,
          passwordHash,
          salt
        }, { transaction });

        if (payload.spouseMemberId) {
          await this.validateSpouseMember(payload.spouseMemberId);
        }

        member = await Member.create({
          ...payload,
          userId: user.id,
          createdBy,
          statusChangeDate: new Date()
        }, { transaction });

        await MemberJourney.create({
          memberId: member.id,
          currentStage: this.mapStatusToStage(member.status),
          lastActivityDate: new Date()
        }, { transaction });

        await this.ensureBaptismMilestone(member.id, member.baptismDate, createdBy, transaction);
        await this.ensureConversionMilestone(member.id, member.conversionDate, createdBy, transaction);

        if (member.status === 'VISITANTE') {
          await MemberMilestone.create({
            memberId: member.id,
            milestoneType: 'PRIMEIRA_VISITA',
            achievedDate: new Date(),
            description: 'Primeira visita a igreja',
            createdBy
          }, { transaction });

          await MemberActivity.create({
            memberId: member.id,
            activityType: 'CELULA_PRESENCA',
            activityDate: new Date(),
            points: 12
          }, { transaction });
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      if (payload.spouseMemberId) {
        await this.syncSpouseLink(member.id, payload.spouseMemberId || null);
      }

      // Invalidar cache
      await cache.del('members:all');

      return await this.getMemberById(member.id);
    } catch (error) {
      throw new Error(`Erro ao criar membro: ${error.message}`);
    }
  }

  /**
   * Buscar membro por ID (com todos os relacionamentos)
   */
  async getMemberById(id) {
    try {
      return await this.getMemberWithDetails({ id });
    } catch (error) {
      throw new Error(`Erro ao buscar membro: ${error.message}`);
    }
  }

  async getMemberByUserId(userId) {
    try {
      if (!userId) {
        throw new Error('Usuario autenticado nao informado');
      }

      return await this.getMemberWithDetails({ userId });
    } catch (error) {
      throw new Error(`Erro ao buscar membro: ${error.message}`);
    }
  }

  /**
   * Listar membros com filtros
   */
  async listMembers(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      const where = {};

      // Filtros
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.campusId) {
        where.campusId = filters.campusId;
      }
      if (filters.celulaId) {
        where.celulaId = filters.celulaId;
      }
      if (filters.search) {
        where[Op.or] = [
          { fullName: { [Op.iLike]: `%${filters.search}%` } },
          { email: { [Op.iLike]: `%${filters.search}%` } },
          { cpf: { [Op.like]: `%${filters.search}%` } }
        ];
      }

      const { count, rows } = await Member.findAndCountAll({
        where,
        include: [
          { model: Campus, as: 'campus', attributes: ['id', 'nome'] },
          { model: Celula, as: 'celula', attributes: ['id', 'celula'] },
          { model: MemberJourney, as: 'journey', attributes: ['currentStage', 'engagementScore', 'healthStatus'] }
        ],
        limit,
        offset,
        order: [['fullName', 'ASC']]
      });

      return {
        members: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Erro ao listar membros: ${error.message}`);
    }
  }

  /**
   * Atualizar membro
   */
  async updateMember(id, data, updatedBy) {
    try {
      const member = await Member.findByPk(id);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const previousSpouseMemberId = member.spouseMemberId || null;
      const payload = this.normalizeSpousePayload(data, member.maritalStatus);
      this.validateGender(payload.gender);

      if (Object.prototype.hasOwnProperty.call(payload, 'spouseMemberId') && payload.spouseMemberId) {
        await this.validateSpouseMember(payload.spouseMemberId, id);
      }

      // Se mudou o status, registrar
      if (payload.status && payload.status !== member.status) {
        payload.statusChangeDate = new Date();

        // Atualizar journey
        const journey = await MemberJourney.findOne({ where: { memberId: id } });
        if (journey) {
          await journey.update({
            currentStage: this.mapStatusToStage(payload.status),
            stageChangedAt: new Date()
          });
        }

        // Se virou MIA, criar registro
        if (payload.status === 'MIA' && member.status !== 'MIA') {
          await this.convertToMIA(id, payload.statusReason, updatedBy);
        }
      }

      await member.update(payload);
      await this.syncLinkedUserFromMember(member.userId, payload);
      await this.ensureBaptismMilestone(member.id, member.baptismDate, updatedBy);
      await this.ensureConversionMilestone(member.id, member.conversionDate, updatedBy);

      if (Object.prototype.hasOwnProperty.call(payload, 'spouseMemberId')) {
        await this.syncSpouseLink(id, payload.spouseMemberId || null, previousSpouseMemberId);
      }

      // Invalidar cache
      await cache.del(`member:${id}`);
      await cache.del('members:all');

      return await this.getMemberById(id);
    } catch (error) {
      throw new Error(`Erro ao atualizar membro: ${error.message}`);
    }
  }

  async updateOwnProfileByUserId(userId, data = {}) {
    try {
      if (!userId) {
        throw new Error('Usuario autenticado nao informado');
      }

      const member = await Member.findOne({ where: { userId } });
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const previousSpouseMemberId = member.spouseMemberId || null;
      const payload = this.normalizeSpousePayload(data, member.maritalStatus);
      this.validateGender(payload.gender);

      if (Object.prototype.hasOwnProperty.call(payload, 'spouseMemberId') && payload.spouseMemberId) {
        await this.validateSpouseMember(payload.spouseMemberId, member.id);
      }

      const transaction = await sequelize.transaction();
      try {
        await member.update(payload, { transaction });
        await this.syncLinkedUserFromMember(member.userId, payload, transaction);
        await this.ensureBaptismMilestone(
          member.id,
          Object.prototype.hasOwnProperty.call(payload, 'baptismDate') ? payload.baptismDate : member.baptismDate,
          userId,
          transaction
        );
        await this.ensureConversionMilestone(
          member.id,
          Object.prototype.hasOwnProperty.call(payload, 'conversionDate') ? payload.conversionDate : member.conversionDate,
          userId,
          transaction
        );
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'spouseMemberId')) {
        await this.syncSpouseLink(member.id, payload.spouseMemberId || null, previousSpouseMemberId);
      }

      await cache.del(`member:${member.id}`);
      await cache.del('members:all');

      return await this.getMemberByUserId(userId);
    } catch (error) {
      throw new Error(`Erro ao atualizar perfil do membro: ${error.message}`);
    }
  }

  /**
   * Deletar membro (soft delete)
   */
  async deleteMember(id) {
    try {
      const member = await Member.findByPk(id);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const transaction = await sequelize.transaction();
      try {
        const linkedUserId = member.userId || null;

        if (member.spouseMemberId) {
          await this.syncSpouseLink(member.id, null);
        }

        await member.destroy({ transaction });

        if (linkedUserId) {
          await User.destroy({
            where: { id: linkedUserId },
            transaction
          });
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      // Invalidar cache
      await cache.del(`member:${id}`);
      await cache.del('members:all');

      return { success: true };
    } catch (error) {
      throw new Error(`Erro ao deletar membro: ${error.message}`);
    }
  }

  /**
   * Converter membro para MIA
   */
  async convertToMIA(memberId, reason, createdBy) {
    try {
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      // Atualizar status do membro
      await member.update({
        status: 'MIA',
        statusChangeDate: new Date(),
        statusReason: reason
      });

      // Criar registro MIA
      const mia = await MIA.create({
        memberId,
        miaDate: new Date(),
        reason: 'OUTRO',
        reasonDetails: reason,
        createdBy
      });

      // Atualizar journey
      const journey = await MemberJourney.findOne({ where: { memberId } });
      if (journey) {
        await journey.update({
          currentStage: 'MIA',
          healthStatus: 'MIA',
          stageChangedAt: new Date()
        });
      }

      // Invalidar cache
      await cache.del(`member:${memberId}`);

      return mia;
    } catch (error) {
      throw new Error(`Erro ao converter para MIA: ${error.message}`);
    }
  }

  /**
   * Vincular User a Member
   */
  async linkUserToMember(memberId, userId) {
    try {
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Usuario nao encontrado');
      }

      // Verificar se o user ja esta vinculado a outro membro
      const existingLink = await Member.findOne({ where: { userId } });
      if (existingLink && existingLink.id !== memberId) {
        throw new Error('Este usuario ja esta vinculado a outro membro');
      }

      await member.update({ userId });

      // Invalidar cache
      await cache.del(`member:${memberId}`);

      return await this.getMemberById(memberId);
    } catch (error) {
      throw new Error(`Erro ao vincular usuario: ${error.message}`);
    }
  }

  /**
   * Mapear status do membro para estagio da jornada
   */
  mapStatusToStage(status) {
    const mapping = {
      VISITANTE: 'VISITANTE',
      CONGREGADO: 'CONGREGADO',
      MEMBRO: 'MEMBRO',
      INATIVO: 'VISITANTE',
      MIA: 'MIA',
      TRANSFERIDO: 'MEMBRO',
      FALECIDO: 'MEMBRO'
    };
    return mapping[status] || 'VISITANTE';
  }

  /**
   * Obter estatisticas gerais
   */
  async getStatistics(campusId = null) {
    try {
      const where = {};
      if (campusId) {
        where.campusId = campusId;
      }

      const total = await Member.count({ where });
      const visitantes = await Member.count({ where: { ...where, status: 'VISITANTE' } });
      const congregados = await Member.count({ where: { ...where, status: 'CONGREGADO' } });
      const membros = await Member.count({ where: { ...where, status: 'MEMBRO' } });
      const inativos = await Member.count({ where: { ...where, status: 'INATIVO' } });
      const mia = await Member.count({ where: { ...where, status: 'MIA' } });

      return {
        total,
        byStatus: {
          visitantes,
          congregados,
          membros,
          inativos,
          mia
        },
        active: visitantes + congregados + membros
      };
    } catch (error) {
      throw new Error(`Erro ao obter estatisticas: ${error.message}`);
    }
  }

  async listActivityTypes(filters = {}) {
    try {
      const includeInactive = String(filters.includeInactive || '').toLowerCase() === 'true';
      const where = includeInactive ? {} : { isActive: true };

      return await MemberActivityType.findAll({
        where,
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
      });
    } catch (error) {
      throw new Error(`Erro ao listar tipos de atividade: ${error.message}`);
    }
  }

  async createActivityType(data = {}, createdBy = null) {
    try {
      const code = this.normalizeActivityTypeCode(data.code);
      if (!code || !ACTIVITY_CODE_REGEX.test(code)) {
        throw new Error('Codigo invalido. Use apenas letras, numeros e underscore');
      }

      if (!data.name || !String(data.name).trim()) {
        throw new Error('Nome do tipo de atividade e obrigatorio');
      }

      const existing = await MemberActivityType.findOne({ where: { code } });
      if (existing) {
        throw new Error('Ja existe um tipo de atividade com este codigo');
      }

      const defaultPoints = Number(data.defaultPoints);
      const sortOrder = Number(data.sortOrder);

      const payload = {
        code,
        name: String(data.name).trim(),
        description: data.description || null,
        category: data.category ? String(data.category).trim().toUpperCase() : null,
        defaultPoints: Number.isFinite(defaultPoints) ? Math.round(defaultPoints) : 0,
        isSystem: Boolean(data.isSystem),
        isActive: Object.prototype.hasOwnProperty.call(data, 'isActive') ? Boolean(data.isActive) : true,
        sortOrder: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0,
        createdBy
      };

      return await MemberActivityType.create(payload);
    } catch (error) {
      throw new Error(`Erro ao criar tipo de atividade: ${error.message}`);
    }
  }

  async updateActivityType(activityTypeId, data = {}) {
    try {
      const activityType = await MemberActivityType.findByPk(activityTypeId);
      if (!activityType) {
        throw new Error('Tipo de atividade nao encontrado');
      }

      const payload = {};

      if (Object.prototype.hasOwnProperty.call(data, 'code')) {
        const nextCode = this.normalizeActivityTypeCode(data.code);
        if (!nextCode || !ACTIVITY_CODE_REGEX.test(nextCode)) {
          throw new Error('Codigo invalido. Use apenas letras, numeros e underscore');
        }

        if (activityType.isSystem && nextCode !== activityType.code) {
          throw new Error('Nao e permitido alterar o codigo de um tipo de sistema');
        }

        if (nextCode !== activityType.code) {
          const existing = await MemberActivityType.findOne({
            where: {
              code: nextCode,
              id: { [Op.ne]: activityTypeId }
            }
          });
          if (existing) {
            throw new Error('Ja existe um tipo de atividade com este codigo');
          }
        }

        payload.code = nextCode;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'name')) {
        if (!data.name || !String(data.name).trim()) {
          throw new Error('Nome do tipo de atividade e obrigatorio');
        }
        payload.name = String(data.name).trim();
      }

      if (Object.prototype.hasOwnProperty.call(data, 'description')) {
        payload.description = data.description || null;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'category')) {
        payload.category = data.category ? String(data.category).trim().toUpperCase() : null;
      }

      if (Object.prototype.hasOwnProperty.call(data, 'defaultPoints')) {
        const defaultPoints = Number(data.defaultPoints);
        if (!Number.isFinite(defaultPoints)) {
          throw new Error('defaultPoints deve ser numerico');
        }
        payload.defaultPoints = Math.round(defaultPoints);
      }

      if (Object.prototype.hasOwnProperty.call(data, 'sortOrder')) {
        const sortOrder = Number(data.sortOrder);
        if (!Number.isFinite(sortOrder)) {
          throw new Error('sortOrder deve ser numerico');
        }
        payload.sortOrder = Math.round(sortOrder);
      }

      if (Object.prototype.hasOwnProperty.call(data, 'isActive')) {
        payload.isActive = Boolean(data.isActive);
      }

      if (Object.prototype.hasOwnProperty.call(data, 'isSystem')) {
        if (activityType.isSystem && data.isSystem === false) {
          throw new Error('Nao e permitido remover a marcacao de tipo de sistema');
        }
        payload.isSystem = Boolean(data.isSystem);
      }

      if (!Object.keys(payload).length) {
        return activityType;
      }

      await activityType.update(payload);
      return activityType;
    } catch (error) {
      throw new Error(`Erro ao atualizar tipo de atividade: ${error.message}`);
    }
  }

  async setActivityTypeActive(activityTypeId, isActive) {
    try {
      const activityType = await MemberActivityType.findByPk(activityTypeId);
      if (!activityType) {
        throw new Error('Tipo de atividade nao encontrado');
      }

      await activityType.update({ isActive: Boolean(isActive) });
      return activityType;
    } catch (error) {
      throw new Error(`Erro ao atualizar status do tipo de atividade: ${error.message}`);
    }
  }

  /**
   * Registrar atividade na jornada
   */
  async addActivity(memberId, data = {}, createdBy = null) {
    try {
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const activityTypeRef = await this.resolveActivityType(data);

      const points = Object.prototype.hasOwnProperty.call(data, 'points')
        ? Number(data.points)
        : Number(activityTypeRef.defaultPoints);

      const activityDate = data.activityDate || new Date();
      const metadata = data.metadata && typeof data.metadata === 'object' ? data.metadata : null;

      const activity = await MemberActivity.create({
        memberId,
        activityType: activityTypeRef.code,
        activityDate,
        points: Number.isFinite(points) ? Math.round(points) : 0,
        metadata: metadata
          ? { ...metadata, createdBy, activityTypeId: activityTypeRef.id }
          : (createdBy ? { createdBy, activityTypeId: activityTypeRef.id } : { activityTypeId: activityTypeRef.id }),
        eventId: data.eventId || null,
        celulaId: data.celulaId || null,
        courseId: data.courseId || null
      });

      await this.recalculateJourneyFromActivities(memberId, { member });

      await cache.del(`member:${memberId}`);
      await cache.del('members:all');

      return activity;
    } catch (error) {
      throw new Error(`Erro ao registrar atividade: ${error.message}`);
    }
  }

  async deleteActivity(memberId, activityId) {
    try {
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const activity = await MemberActivity.findOne({
        where: {
          id: activityId,
          memberId
        }
      });

      if (!activity) {
        throw new Error('Atividade nao encontrada para este membro');
      }

      await activity.destroy();
      await this.recalculateJourneyFromActivities(memberId, { member });

      await cache.del(`member:${memberId}`);
      await cache.del('members:all');

      return { success: true };
    } catch (error) {
      throw new Error(`Erro ao excluir atividade: ${error.message}`);
    }
  }

  /**
   * Registrar marco na jornada
   */
  async addMilestone(memberId, data = {}, createdBy = null) {
    try {
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const milestoneType = await this.resolveMilestoneType(data);

      const milestone = await MemberMilestone.create({
        memberId,
        milestoneType,
        achievedDate: data.achievedDate || new Date(),
        description: data.description || null,
        certificateUrl: data.certificateUrl || null,
        createdBy
      });

      await this.recalculateJourneyFromActivities(memberId, { member });

      await cache.del(`member:${memberId}`);
      await cache.del('members:all');

      return milestone;
    } catch (error) {
      throw new Error(`Erro ao registrar marco: ${error.message}`);
    }
  }

  /**
   * Atualizar dados da jornada do membro
   */
  async updateJourney(memberId, data = {}) {
    try {
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const journey = await this.ensureJourney(memberId);
      const payload = {};

      if (Object.prototype.hasOwnProperty.call(data, 'currentStage')) {
        this.validateJourneyStage(data.currentStage);
        if (data.currentStage !== journey.currentStage) {
          payload.currentStage = data.currentStage;
          payload.stageChangedAt = data.stageChangedAt || new Date();
        }
      }

      if (!Object.keys(payload).length) {
        return this.recalculateJourneyFromActivities(memberId, { member, journey });
      }

      await journey.update(payload);
      await this.recalculateJourneyFromActivities(memberId, { member, journey });

      await cache.del(`member:${memberId}`);
      await cache.del('members:all');

      return journey;
    } catch (error) {
      throw new Error(`Erro ao atualizar jornada: ${error.message}`);
    }
  }
}

module.exports = new MemberService();
