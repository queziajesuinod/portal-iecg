const { Op } = require('sequelize');
const uuid = require('uuid');
const {
  sequelize,
  User,
  Permissao,
  UserPermissao,
  BoardJournal,
  BoardJournalMember,
  BoardChallengeCategory,
  BoardChallenge,
  BoardChallengeSubmission,
  BoardBadge,
  BoardUserBadge
} = require('../models');
const { hasUserPermission, buildPermissionInclude, extractPermissionNames } = require('./permissionResolver');

const ADMIN_PERMISSIONS = ['DIARIO_BORDO_ADMIN', 'ADMIN_FULL_ACCESS'];
const JOURNAL_MANAGER_PERMISSION = 'DIARIO_BORDO_MANAGER';
const CHALLENGE_TYPES = ['question', 'text', 'file', 'form', 'lesson'];
const BADGE_TYPES = ['level', 'achievement', 'special'];
const MEMBER_STATUSES = ['pending', 'approved', 'rejected'];
const ADMIN_PROFILE_NAMES = ['ADMIN', 'ADMINISTRADOR'];

function normalizeString(value, maxLength = null) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (maxLength && normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }
  return normalized;
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(lowered)) return true;
    if (['false', '0', 'no', 'nao'].includes(lowered)) return false;
  }
  return Boolean(value);
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getStartOfDay(value) {
  const parsed = normalizeDate(value);
  if (!parsed) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getEndOfDay(value) {
  const parsed = normalizeDate(value);
  if (!parsed) return null;
  parsed.setHours(23, 59, 59, 999);
  return parsed;
}

function isChallengeWithinSchedule(challenge, referenceDate = new Date()) {
  const startDate = getStartOfDay(challenge?.startDate);
  const endDate = getEndOfDay(challenge?.endDate);

  if (startDate && startDate.getTime() > referenceDate.getTime()) {
    return false;
  }
  if (endDate && endDate.getTime() < referenceDate.getTime()) {
    return false;
  }
  return true;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return value.split('\n').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function normalizeQuestionOptions(value) {
  return ensureArray(value)
    .map((item) => (typeof item === 'string' ? item.trim() : normalizeString(item?.label || item?.value || item)))
    .filter(Boolean);
}

function normalizeFormSchema(value) {
  return ensureArray(value)
    .map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        const label = normalizeString(item);
        if (!label) return null;
        return {
          name: `field_${index + 1}`,
          label,
          type: 'text',
          required: false,
          options: []
        };
      }

      const name = normalizeString(item.name || item.key || `field_${index + 1}`);
      const label = normalizeString(item.label || item.name || item.key || `Campo ${index + 1}`);
      const type = normalizeString(item.type || 'text');
      return {
        name,
        label,
        type: ['text', 'textarea', 'number', 'select', 'date', 'checkbox'].includes(type) ? type : 'text',
        required: normalizeBoolean(item.required, false),
        options: type === 'select' ? normalizeQuestionOptions(item.options) : []
      };
    })
    .filter(Boolean);
}

function serializeJournal(record, membership = null, metrics = null) {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    coverImageUrl: record.coverImageUrl,
    instructions: record.instructions,
    isActive: record.isActive,
    managerUserId: record.managerUserId || null,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    creator: record.creator ? {
      id: record.creator.id,
      name: record.creator.name,
      email: record.creator.email
    } : null,
    manager: record.manager ? {
      id: record.manager.id,
      name: record.manager.name,
      email: record.manager.email
    } : null,
    membership,
    metrics
  };
}

function serializeJournalMember(record) {
  return {
    id: record.id,
    journalId: record.journalId,
    userId: record.userId,
    status: record.status,
    requestedAt: record.requestedAt,
    approvedAt: record.approvedAt,
    approvedBy: record.approvedBy,
    note: record.note,
    user: record.user ? {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email
    } : null,
    approver: record.approver ? {
      id: record.approver.id,
      name: record.approver.name
    } : null
  };
}

function serializeCategory(record) {
  return {
    id: record.id,
    journalId: record.journalId,
    name: record.name,
    description: record.description,
    icon: record.icon,
    color: record.color,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function serializeBadge(record) {
  return {
    id: record.id,
    journalId: record.journalId,
    name: record.name,
    description: record.description,
    icon: record.icon,
    pointsRequired: record.pointsRequired,
    badgeType: record.badgeType,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function serializeChallenge(record, userSubmission = null) {
  return {
    id: record.id,
    journalId: record.journalId,
    title: record.title,
    description: record.description,
    points: record.points,
    categoryId: record.categoryId,
    challengeType: record.challengeType,
    contentHtml: record.contentHtml,
    questionText: record.questionText,
    questionOptions: Array.isArray(record.questionOptions) ? record.questionOptions : [],
    fileTypes: record.fileTypes,
    formSchema: Array.isArray(record.formSchema) ? record.formSchema : [],
    startDate: record.startDate,
    endDate: record.endDate,
    dueDate: record.dueDate,
    allowSecondChance: Boolean(record.allowSecondChance),
    secondChancePoints: record.secondChancePoints === null || record.secondChancePoints === undefined ? null : Number(record.secondChancePoints),
    isActive: record.isActive,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    category: record.category ? serializeCategory(record.category) : null,
    creator: record.creator ? {
      id: record.creator.id,
      name: record.creator.name,
      email: record.creator.email
    } : null,
    userSubmission
  };
}

function serializeSubmission(record, pointsByUser = null) {
  return {
    id: record.id,
    userId: record.userId,
    journalId: record.journalId,
    challengeId: record.challengeId,
    responseType: record.responseType,
    responseText: record.responseText,
    responseFileUrl: record.responseFileUrl,
    responsePayload: record.responsePayload || null,
    status: record.status,
    submittedAt: record.submittedAt,
    approvedAt: record.approvedAt,
    approvedBy: record.approvedBy,
    feedback: record.feedback,
    attemptNumber: Number(record.attemptNumber || 1),
    pointsAwarded: record.pointsAwarded === null || record.pointsAwarded === undefined ? null : Number(record.pointsAwarded),
    challenge: record.challenge ? serializeChallenge(record.challenge) : null,
    user: record.user ? {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
      points: pointsByUser && pointsByUser[record.user.id] !== undefined ? Number(pointsByUser[record.user.id]) : 0
    } : null,
    approver: record.approver ? {
      id: record.approver.id,
      name: record.approver.name
    } : null
  };
}

async function hasAdminPermission(userId) {
  return hasUserPermission(userId, ADMIN_PERMISSIONS);
}

function normalizeProfileName(value) {
  return String(value || '').trim().toUpperCase();
}

async function getBoardAccessContext(userId) {
  if (!userId) {
    return {
      user: null,
      permissionNames: [],
      isAdmin: false
    };
  }

  const user = await User.findByPk(userId, {
    include: buildPermissionInclude()
  });
  const permissionNames = extractPermissionNames(user);
  const profileName = normalizeProfileName(user?.Perfil?.descricao || user?.perfil?.descricao);
  const isAdmin = ADMIN_PROFILE_NAMES.includes(profileName)
    || permissionNames.includes('ADMIN_FULL_ACCESS')
    || permissionNames.includes('DIARIO_BORDO_ADMIN');

  return {
    user,
    permissionNames,
    isAdmin
  };
}

async function canAccessBoardManagement(userId, journalId = null) {
  const access = await getBoardAccessContext(userId);
  if (access.isAdmin) return true;
  if (!userId) return false;
  if (!journalId) {
    const managedCount = await BoardJournal.count({ where: { managerUserId: userId } });
    return managedCount > 0;
  }
  const managedJournal = await BoardJournal.count({ where: { id: journalId, managerUserId: userId } });
  return managedJournal > 0;
}

async function ensureJournalManagerPermission() {
  const [permission] = await Permissao.findOrCreate({
    where: { nome: JOURNAL_MANAGER_PERMISSION },
    defaults: {
      id: uuid.v4(),
      nome: JOURNAL_MANAGER_PERMISSION,
      descricao: 'Gerenciar o diario atribuido como gestor'
    }
  });
  return permission;
}

async function syncJournalManagerPermission(previousManagerUserId = null, nextManagerUserId = null) {
  const normalizedPrevious = normalizeString(previousManagerUserId);
  const normalizedNext = normalizeString(nextManagerUserId);

  if (!normalizedPrevious && !normalizedNext) {
    return;
  }

  const permission = await ensureJournalManagerPermission();

  if (normalizedNext) {
    await UserPermissao.findOrCreate({
      where: {
        userId: normalizedNext,
        permissaoId: permission.id
      },
      defaults: {
        id: uuid.v4(),
        userId: normalizedNext,
        permissaoId: permission.id
      }
    });
  }

  if (normalizedPrevious && normalizedPrevious !== normalizedNext) {
    const managedCount = await BoardJournal.count({
      where: { managerUserId: normalizedPrevious }
    });
    if (managedCount === 0) {
      await UserPermissao.destroy({
        where: {
          userId: normalizedPrevious,
          permissaoId: permission.id
        }
      });
    }
  }
}

async function getApprovedPointsByUser(journalId) {
  const rows = await BoardChallengeSubmission.findAll({
    where: { journalId, status: 'approved' },
    attributes: ['userId', [sequelize.fn('SUM', sequelize.col('pointsAwarded')), 'points']],
    group: ['userId'],
    raw: true
  });
  return rows.reduce((acc, row) => {
    acc[row.userId] = Number(row.points || 0);
    return acc;
  }, {});
}

async function getJournalMembershipRow(journalId, userId) {
  if (!journalId || !userId) return null;
  return BoardJournalMember.findOne({ where: { journalId, userId } });
}

async function ensureJournalExists(journalId) {
  const journal = await BoardJournal.findByPk(journalId, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
    ]
  });
  if (!journal) {
    throw new Error('Diario nao encontrado');
  }
  return journal;
}

async function ensureJournalAccess(journalId, userId, options = {}) {
  const journal = await ensureJournalExists(journalId);
  const isAdmin = options.isAdminOverride !== undefined ? options.isAdminOverride : await hasAdminPermission(userId);
  const isManager = String(journal.managerUserId || '') === String(userId || '');
  if (isAdmin) {
    return { journal, membership: null, isAdmin: true };
  }
  if (isManager) {
    return {
      journal,
      membership: null,
      isAdmin: false,
      isManager: true
    };
  }
  const membership = await getJournalMembershipRow(journalId, userId);
  if (!membership || membership.status !== 'approved') {
    throw new Error('Usuario sem permissao para acessar este diario');
  }
  return {
    journal,
    membership,
    isAdmin: false
  };
}

async function ensureJournalManagementAccess(journalId, userId) {
  const journal = await ensureJournalExists(journalId);
  const access = await getBoardAccessContext(userId);
  if (access.isAdmin) {
    return { journal, isAdmin: true, isManager: false };
  }
  if (String(journal.managerUserId || '') === String(userId || '')) {
    return { journal, isAdmin: false, isManager: true };
  }
  throw new Error('Usuario sem permissao para gerenciar este diario');
}

async function createOrRefreshJournalMembership(journalId, userId, note = null) {
  const existing = await getJournalMembershipRow(journalId, userId);
  if (existing?.status === 'approved') {
    throw new Error('Usuario ja aprovado neste diario');
  }
  if (existing) {
    await existing.update({
      status: 'pending',
      requestedAt: new Date(),
      approvedAt: null,
      approvedBy: null,
      note: normalizeString(note)
    });
    return existing;
  }

  return BoardJournalMember.create({
    journalId,
    userId,
    status: 'pending',
    requestedAt: new Date(),
    note: normalizeString(note)
  });
}
async function listJournals(requesterId, options = {}) {
  const access = await getBoardAccessContext(requesterId);
  const scope = normalizeString(options.scope);
  const where = {};

  if (scope === 'management') {
    if (!access.isAdmin) {
      where.managerUserId = requesterId || null;
    }
  } else if (!access.isAdmin) {
    where.isActive = true;
  }

  const records = await BoardJournal.findAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const memberships = requesterId
    ? await BoardJournalMember.findAll({ where: { userId: requesterId } })
    : [];
  const membershipMap = memberships.reduce((acc, row) => {
    acc[row.journalId] = serializeJournalMember(row);
    return acc;
  }, {});

  const counts = await BoardJournalMember.findAll({
    attributes: [
      'journalId',
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['journalId', 'status'],
    raw: true
  });
  const metricsMap = counts.reduce((acc, row) => {
    acc[row.journalId] = acc[row.journalId] || { approvedMembers: 0, pendingRequests: 0, rejectedRequests: 0 };
    if (row.status === 'approved') acc[row.journalId].approvedMembers = Number(row.count || 0);
    if (row.status === 'pending') acc[row.journalId].pendingRequests = Number(row.count || 0);
    if (row.status === 'rejected') acc[row.journalId].rejectedRequests = Number(row.count || 0);
    return acc;
  }, {});

  return records.map((record) => serializeJournal(record, membershipMap[record.id] || null, metricsMap[record.id] || {
    approvedMembers: 0,
    pendingRequests: 0,
    rejectedRequests: 0
  }));
}

async function getJournalById(journalId, requesterId) {
  const journal = await ensureJournalExists(journalId);
  const membership = await getJournalMembershipRow(journalId, requesterId);
  const countRows = await BoardJournalMember.findAll({
    where: { journalId },
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true
  });
  const metrics = countRows.reduce((acc, row) => {
    if (row.status === 'approved') acc.approvedMembers = Number(row.count || 0);
    if (row.status === 'pending') acc.pendingRequests = Number(row.count || 0);
    if (row.status === 'rejected') acc.rejectedRequests = Number(row.count || 0);
    return acc;
  }, { approvedMembers: 0, pendingRequests: 0, rejectedRequests: 0 });
  return serializeJournal(journal, membership ? serializeJournalMember(membership) : null, metrics);
}

async function ensureSingleActiveJournalManager(managerUserId, options = {}) {
  const normalizedManagerUserId = normalizeString(managerUserId);
  if (!normalizedManagerUserId) {
    return;
  }

  const where = {
    managerUserId: normalizedManagerUserId,
    isActive: true
  };

  if (options.excludeJournalId) {
    where.id = {
      [Op.ne]: options.excludeJournalId
    };
  }

  const existingJournal = await BoardJournal.findOne({
    where,
    attributes: ['id', 'name']
  });

  if (existingJournal) {
    throw new Error(`Este gestor ja possui um diario ativo atribuido: ${existingJournal.name}`);
  }
}

async function createJournal(payload, userId) {
  const safePayload = payload || {};
  const name = normalizeString(safePayload.name, 150);
  if (!name) throw new Error('Nome do diario e obrigatorio');
  const managerUserId = normalizeString(safePayload.managerUserId);
  const isActive = normalizeBoolean(safePayload.isActive, true);

  if (managerUserId) {
    const managerUser = await User.findByPk(managerUserId, { attributes: ['id'] });
    if (!managerUser) {
      throw new Error('Gestor do diario nao encontrado');
    }
  }

  if (managerUserId && isActive) {
    await ensureSingleActiveJournalManager(managerUserId);
  }

  const record = await BoardJournal.create({
    name,
    description: normalizeString(safePayload.description),
    coverImageUrl: normalizeString(safePayload.coverImageUrl),
    instructions: normalizeString(safePayload.instructions),
    isActive,
    managerUserId,
    createdBy: userId
  });

  await syncJournalManagerPermission(null, managerUserId);

  await BoardJournalMember.create({
    journalId: record.id,
    userId,
    status: 'approved',
    requestedAt: new Date(),
    approvedAt: new Date(),
    approvedBy: userId,
    note: 'Criador do diario'
  });

  return getJournalById(record.id, userId);
}

async function updateJournal(journalId, payload = {}) {
  const record = await ensureJournalExists(journalId);
  const name = normalizeString(payload.name, 150);
  if (!name) throw new Error('Nome do diario e obrigatorio');
  const previousManagerUserId = normalizeString(record.managerUserId);
  const managerUserId = normalizeString(payload.managerUserId);
  const isActive = normalizeBoolean(payload.isActive, record.isActive);

  if (managerUserId) {
    const managerUser = await User.findByPk(managerUserId, { attributes: ['id'] });
    if (!managerUser) {
      throw new Error('Gestor do diario nao encontrado');
    }
  }

  if (managerUserId && isActive) {
    await ensureSingleActiveJournalManager(managerUserId, { excludeJournalId: record.id });
  }

  await record.update({
    name,
    description: normalizeString(payload.description),
    coverImageUrl: normalizeString(payload.coverImageUrl),
    instructions: normalizeString(payload.instructions),
    isActive,
    managerUserId
  });

  await syncJournalManagerPermission(previousManagerUserId, managerUserId);

  return getJournalById(record.id, record.createdBy);
}

async function requestJournalAccess(journalId, userId, note = null) {
  const journal = await ensureJournalExists(journalId);
  if (!journal.isActive) {
    throw new Error('Diario inativo');
  }
  const membership = await createOrRefreshJournalMembership(journalId, userId, note);
  return serializeJournalMember(membership);
}

async function getJournalMembers(journalId) {
  await ensureJournalExists(journalId);
  const rows = await BoardJournalMember.findAll({
    where: { journalId },
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'approver', attributes: ['id', 'name'] }
    ],
    order: [['requestedAt', 'DESC']]
  });
  return rows.map(serializeJournalMember);
}

async function updateJournalMemberStatus(journalId, memberId, status, adminId, note = null) {
  if (!MEMBER_STATUSES.includes(status) || status === 'pending') {
    throw new Error('Status de membro invalido');
  }

  const row = await BoardJournalMember.findOne({ where: { id: memberId, journalId } });
  if (!row) {
    throw new Error('Solicitacao de acesso nao encontrada');
  }

  await row.update({
    status,
    approvedAt: new Date(),
    approvedBy: adminId,
    note: normalizeString(note)
  });

  return BoardJournalMember.findByPk(row.id, {
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'approver', attributes: ['id', 'name'] }
    ]
  }).then(serializeJournalMember);
}

async function approveJournalMember(journalId, memberId, adminId, note = null) {
  return updateJournalMemberStatus(journalId, memberId, 'approved', adminId, note);
}

async function rejectJournalMember(journalId, memberId, adminId, note = null) {
  return updateJournalMemberStatus(journalId, memberId, 'rejected', adminId, note);
}

async function removeJournalMember(journalId, memberId) {
  const journal = await ensureJournalExists(journalId);
  const row = await BoardJournalMember.findOne({
    where: { id: memberId, journalId }
  });

  if (!row) {
    throw new Error('Membro do diario nao encontrado');
  }

  if (String(row.userId) === String(journal.createdBy)) {
    throw new Error('Nao e possivel remover o criador do diario');
  }

  await row.destroy();
}

async function getJournalPoints(userId, journalId) {
  const total = await BoardChallengeSubmission.sum('pointsAwarded', {
    where: { userId, journalId, status: 'approved' }
  });
  return Number(total || 0);
}

async function awardEligibleBadges(userId, journalId, transaction) {
  const points = await BoardChallengeSubmission.sum('pointsAwarded', {
    where: { userId, journalId, status: 'approved' },
    transaction
  });
  const badges = await BoardBadge.findAll({
    where: {
      journalId,
      isActive: true,
      pointsRequired: { [Op.ne]: null }
    },
    order: [['pointsRequired', 'ASC'], ['name', 'ASC']],
    transaction
  });

  const existingRows = await BoardUserBadge.findAll({
    where: { userId, journalId },
    attributes: ['badgeId'],
    transaction
  });
  const existingBadgeIds = new Set(existingRows.map((row) => row.badgeId));

  const eligibleBadges = badges.filter((badge) => (
    !existingBadgeIds.has(badge.id)
    && Number(points || 0) >= Number(badge.pointsRequired || 0)
  ));

  return Promise.all(eligibleBadges.map((badge) => BoardUserBadge.create({
    userId,
    journalId,
    badgeId: badge.id,
    earnedAt: new Date()
  }, { transaction })));
}

async function normalizeCategoryPayload(payload = {}) {
  const journalId = normalizeString(payload.journalId);
  if (!journalId) throw new Error('Diario e obrigatorio');
  await ensureJournalExists(journalId);

  const name = normalizeString(payload.name, 100);
  if (!name) throw new Error('Nome da categoria e obrigatorio');

  return {
    journalId,
    name,
    description: normalizeString(payload.description),
    icon: normalizeString(payload.icon, 80),
    color: normalizeString(payload.color, 20)
  };
}

async function getChallengeCategories(journalId, requesterId = null) {
  if (!journalId) throw new Error('Diario e obrigatorio');
  if (requesterId) {
    await ensureJournalAccess(journalId, requesterId);
  } else {
    await ensureJournalExists(journalId);
  }
  const records = await BoardChallengeCategory.findAll({
    where: { journalId },
    order: [['name', 'ASC']]
  });
  return records.map(serializeCategory);
}

async function createChallengeCategory(payload = {}, requesterId = null) {
  const normalized = await normalizeCategoryPayload(payload);
  if (requesterId) {
    await ensureJournalManagementAccess(normalized.journalId, requesterId);
  }
  const duplicated = await BoardChallengeCategory.findOne({
    where: {
      journalId: normalized.journalId,
      name: { [Op.iLike]: normalized.name }
    }
  });
  if (duplicated) throw new Error('Ja existe uma categoria com este nome neste diario');
  const record = await BoardChallengeCategory.create(normalized);
  return serializeCategory(record);
}
async function updateChallengeCategory(id, payload = {}, requesterId = null) {
  const record = await BoardChallengeCategory.findByPk(id);
  if (!record) throw new Error('Categoria nao encontrada');
  if (requesterId) {
    await ensureJournalManagementAccess(record.journalId, requesterId);
  }

  const normalized = await normalizeCategoryPayload({ ...payload, journalId: record.journalId });
  const duplicated = await BoardChallengeCategory.findOne({
    where: {
      id: { [Op.ne]: id },
      journalId: record.journalId,
      name: { [Op.iLike]: normalized.name }
    }
  });
  if (duplicated) throw new Error('Ja existe uma categoria com este nome neste diario');
  await record.update(normalized);
  return serializeCategory(record);
}

async function deleteChallengeCategory(id, requesterId = null) {
  const record = await BoardChallengeCategory.findByPk(id);
  if (!record) throw new Error('Categoria nao encontrada');
  if (requesterId) {
    await ensureJournalManagementAccess(record.journalId, requesterId);
  }
  const usageCount = await BoardChallenge.count({ where: { categoryId: id } });
  if (usageCount > 0) throw new Error('Nao e possivel remover categoria com desafios vinculados');
  await record.destroy();
}

async function normalizeChallengePayload(payload = {}, userId = null, existing = null) {
  const journalId = normalizeString(payload.journalId || existing?.journalId);
  if (!journalId) throw new Error('Diario e obrigatorio');
  await ensureJournalExists(journalId);

  const title = normalizeString(payload.title, 255);
  if (!title) throw new Error('Titulo do desafio e obrigatorio');

  const categoryId = normalizeString(payload.categoryId);
  if (!categoryId) throw new Error('Categoria e obrigatoria');
  const category = await BoardChallengeCategory.findOne({ where: { id: categoryId, journalId } });
  if (!category) throw new Error('Categoria invalida para este diario');

  const points = normalizeInteger(payload.points, NaN);
  if (!Number.isFinite(points) || points < 1) throw new Error('Pontuacao deve ser maior que zero');

  const challengeType = normalizeString(payload.challengeType || existing?.challengeType || 'text');
  if (!CHALLENGE_TYPES.includes(challengeType)) throw new Error('Tipo de desafio invalido');

  const dueDate = payload.dueDate ? normalizeDate(payload.dueDate) : null;
  if (payload.dueDate && !dueDate) throw new Error('Data limite invalida');
  const startDate = payload.startDate ? getStartOfDay(payload.startDate) : null;
  if (payload.startDate && !startDate) throw new Error('Data de inicio invalida');
  const endDate = payload.endDate ? getStartOfDay(payload.endDate) : null;
  if (payload.endDate && !endDate) throw new Error('Data de fim invalida');
  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    throw new Error('Data de inicio nao pode ser maior que a data de fim');
  }

  const normalized = {
    journalId,
    title,
    description: normalizeString(payload.description),
    points,
    categoryId,
    challengeType,
    contentHtml: normalizeString(payload.contentHtml),
    questionText: normalizeString(payload.questionText),
    questionOptions: null,
    fileTypes: normalizeString(payload.fileTypes, 255),
    formSchema: null,
    startDate,
    endDate,
    dueDate,
    allowSecondChance: normalizeBoolean(payload.allowSecondChance, existing ? existing.allowSecondChance : false),
    secondChancePoints: null,
    isActive: normalizeBoolean(payload.isActive, existing ? existing.isActive : true),
    createdBy: existing ? existing.createdBy : userId
  };

  if (normalized.allowSecondChance) {
    const secondChancePoints = payload.secondChancePoints === '' || payload.secondChancePoints === null || payload.secondChancePoints === undefined
      ? NaN
      : normalizeInteger(payload.secondChancePoints, NaN);
    if (!Number.isFinite(secondChancePoints) || secondChancePoints < 0) {
      throw new Error('Pontuacao da segunda chance e obrigatoria');
    }
    if (secondChancePoints >= points) {
      throw new Error('Pontuacao da segunda chance deve ser menor que a pontuacao principal');
    }
    normalized.secondChancePoints = secondChancePoints;
  }

  if (challengeType === 'question') {
    const options = normalizeQuestionOptions(payload.questionOptions);
    if (!options.length) throw new Error('Desafios de pergunta precisam de opcoes');
    normalized.questionOptions = options;
    normalized.questionText = normalizeString(payload.questionText) || title;
  }

  if (challengeType === 'form') {
    const formSchema = normalizeFormSchema(payload.formSchema);
    if (!formSchema.length) throw new Error('Desafios de formulario precisam de schema');
    normalized.formSchema = formSchema;
  }

  if (challengeType === 'lesson') {
    const contentHtml = normalizeString(payload.contentHtml);
    const lessonSchema = normalizeFormSchema(payload.formSchema);
    if (!contentHtml) throw new Error('Licoes precisam de conteudo HTML com instrucoes');
    if (!lessonSchema.length) throw new Error('Licoes precisam de atividades finais');
    normalized.contentHtml = contentHtml;
    normalized.formSchema = lessonSchema;
  }

  if (challengeType === 'file') {
    normalized.fileTypes = normalized.fileTypes || 'pdf,jpg,png,doc,docx';
  }

  return normalized;
}

async function getChallenges(filters = {}, requesterId = null) {
  const journalId = normalizeString(filters.journalId);
  if (!journalId) throw new Error('Diario e obrigatorio');
  if (requesterId) {
    await ensureJournalAccess(journalId, requesterId, { isAdminOverride: normalizeBoolean(filters.isAdminOverride, undefined) });
  }

  const where = { journalId };
  const search = normalizeString(filters.search);
  if (search) {
    where[Op.or] = [{ title: { [Op.iLike]: `%${search}%` } }, { description: { [Op.iLike]: `%${search}%` } }];
  }
  const categoryId = normalizeString(filters.categoryId);
  if (categoryId) where.categoryId = categoryId;

  const includeInactive = normalizeBoolean(filters.includeInactive, false);
  if (!includeInactive) where.isActive = true;

  const records = await BoardChallenge.findAll({
    where,
    include: [
      { model: BoardChallengeCategory, as: 'category' },
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
    ],
    order: [['isActive', 'DESC'], ['dueDate', 'ASC'], ['createdAt', 'DESC']]
  });

  const visibleRecords = includeInactive
    ? records
    : records.filter((record) => isChallengeWithinSchedule(record));

  let latestSubmissionByChallenge = {};
  if (requesterId) {
    const submissions = await BoardChallengeSubmission.findAll({
      where: { userId: requesterId, journalId },
      order: [['submittedAt', 'DESC']]
    });
    latestSubmissionByChallenge = submissions.reduce((acc, record) => {
      if (!acc[record.challengeId]) acc[record.challengeId] = serializeSubmission(record);
      return acc;
    }, {});
  }

  return visibleRecords.map((record) => serializeChallenge(record, latestSubmissionByChallenge[record.id] || null));
}

async function getChallengeById(id, requesterId = null) {
  const record = await BoardChallenge.findByPk(id, {
    include: [
      { model: BoardChallengeCategory, as: 'category' },
      { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
    ]
  });
  if (!record) throw new Error('Desafio nao encontrado');
  if (requesterId) await ensureJournalAccess(record.journalId, requesterId);

  let userSubmission = null;
  if (requesterId) {
    const latestSubmission = await BoardChallengeSubmission.findOne({
      where: {
        challengeId: id,
        userId: requesterId,
        journalId: record.journalId
      },
      order: [['submittedAt', 'DESC']]
    });
    userSubmission = latestSubmission ? serializeSubmission(latestSubmission) : null;
  }

  return serializeChallenge(record, userSubmission);
}

async function createChallenge(payload, userId) {
  const normalized = await normalizeChallengePayload(payload, userId);
  await ensureJournalManagementAccess(normalized.journalId, userId);
  const record = await BoardChallenge.create(normalized);
  return getChallengeById(record.id, userId);
}

async function updateChallenge(id, payload, requesterId = null) {
  const record = await BoardChallenge.findByPk(id);
  if (!record) throw new Error('Desafio nao encontrado');
  if (requesterId) {
    await ensureJournalManagementAccess(record.journalId, requesterId);
  }
  const normalized = await normalizeChallengePayload(payload, null, record);
  await record.update(normalized);
  return getChallengeById(record.id);
}

async function deleteChallenge(id, requesterId = null) {
  const record = await BoardChallenge.findByPk(id);
  if (!record) throw new Error('Desafio nao encontrado');
  if (requesterId) {
    await ensureJournalManagementAccess(record.journalId, requesterId);
  }
  const submissionCount = await BoardChallengeSubmission.count({ where: { challengeId: id } });
  if (submissionCount > 0) throw new Error('Nao e possivel remover desafio com respostas vinculadas');
  await record.destroy();
}

async function normalizeSubmissionPayload(payload, challenge) {
  const responseType = normalizeString(payload.responseType || challenge.challengeType);
  if (!CHALLENGE_TYPES.includes(responseType)) throw new Error('Tipo de resposta invalido');
  const normalized = {
    responseType,
    responseText: null,
    responseFileUrl: null,
    responsePayload: null
  };

  if (challenge.challengeType === 'question' || challenge.challengeType === 'text') {
    const answer = normalizeString(payload.responseText);
    if (!answer) throw new Error('Resposta e obrigatoria');
    normalized.responseText = answer;
  } else if (challenge.challengeType === 'file') {
    const fileUrl = normalizeString(payload.responseFileUrl);
    if (!fileUrl) throw new Error('Informe o link/arquivo da resposta');
    normalized.responseFileUrl = fileUrl;
  } else if (challenge.challengeType === 'form' || challenge.challengeType === 'lesson') {
    const schema = Array.isArray(challenge.formSchema) ? challenge.formSchema : [];
    const rawPayload = payload.responsePayload && typeof payload.responsePayload === 'object' ? payload.responsePayload : {};
    const responsePayload = {};
    schema.forEach((field) => {
      const fieldName = normalizeString(field.name);
      if (!fieldName) return;
      const value = rawPayload[fieldName];
      const isCheckbox = field.type === 'checkbox';
      const normalizedValue = isCheckbox
        ? normalizeBoolean(value, false)
        : (value === undefined || value === null ? '' : String(value).trim());
      const isRequired = challenge.challengeType === 'lesson' ? true : Boolean(field.required);
      if (isCheckbox && isRequired && !normalizedValue) {
        throw new Error(`Checklist obrigatorio: ${field.label || fieldName}`);
      }
      if (!isCheckbox && isRequired && !normalizedValue) {
        throw new Error(`Campo obrigatorio: ${field.label || fieldName}`);
      }
      responsePayload[fieldName] = normalizedValue;
    });
    normalized.responsePayload = responsePayload;
    normalized.responseText = JSON.stringify(responsePayload);
  }

  return normalized;
}
function canUseSecondChance(challenge, latestSubmission) {
  if (!challenge?.allowSecondChance) return false;
  if (!latestSubmission) return false;
  if (latestSubmission.status !== 'rejected') return false;
  return Number(latestSubmission.attemptNumber || 1) < 2;
}

function getAwardedPointsForSubmission(challenge, submission) {
  if (Number(submission?.attemptNumber || 1) > 1 && challenge?.allowSecondChance) {
    return Number(challenge?.secondChancePoints || 0);
  }
  return Number(challenge?.points || 0);
}

async function getPendingSubmissions(filters = {}) {
  const journalId = normalizeString(filters.journalId);
  if (!journalId) throw new Error('Diario e obrigatorio');

  const where = { journalId, status: 'pending' };
  const challengeId = normalizeString(filters.challengeId);
  if (challengeId) where.challengeId = challengeId;
  const userId = normalizeString(filters.userId);
  if (userId) where.userId = userId;

  const pointsByUser = await getApprovedPointsByUser(journalId);
  const records = await BoardChallengeSubmission.findAll({
    where,
    include: [
      {
        model: BoardChallenge,
        as: 'challenge',
        include: [{ model: BoardChallengeCategory, as: 'category' }]
      },
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
    ],
    order: [['submittedAt', 'DESC']]
  });
  return records.map((record) => serializeSubmission(record, pointsByUser));
}

async function getSubmissionsByChallenge(challengeId) {
  const challenge = await BoardChallenge.findByPk(challengeId);
  if (!challenge) throw new Error('Desafio nao encontrado');
  const pointsByUser = await getApprovedPointsByUser(challenge.journalId);
  const records = await BoardChallengeSubmission.findAll({
    where: { challengeId },
    include: [
      {
        model: BoardChallenge,
        as: 'challenge',
        include: [{ model: BoardChallengeCategory, as: 'category' }]
      },
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'approver', attributes: ['id', 'name'] }
    ],
    order: [['submittedAt', 'DESC']]
  });
  return records.map((record) => serializeSubmission(record, pointsByUser));
}

async function getMySubmissions(userId, journalId) {
  if (!journalId) throw new Error('Diario e obrigatorio');
  await ensureJournalAccess(journalId, userId);
  const pointsByUser = await getApprovedPointsByUser(journalId);
  const records = await BoardChallengeSubmission.findAll({
    where: { userId, journalId },
    include: [
      {
        model: BoardChallenge,
        as: 'challenge',
        include: [{ model: BoardChallengeCategory, as: 'category' }]
      },
      { model: User, as: 'approver', attributes: ['id', 'name'] }
    ],
    order: [['submittedAt', 'DESC']]
  });
  return records.map((record) => serializeSubmission(record, pointsByUser));
}

async function createSubmission(payload, userId) {
  const challengeId = normalizeString(payload.challengeId);
  if (!challengeId) throw new Error('Desafio e obrigatorio');

  const challenge = await BoardChallenge.findByPk(challengeId);
  if (!challenge || !challenge.isActive) throw new Error('Desafio nao encontrado ou inativo');
  await ensureJournalAccess(challenge.journalId, userId);

  if (!isChallengeWithinSchedule(challenge)) {
    throw new Error('Desafio fora da janela programada');
  }

  if (challenge.dueDate && getEndOfDay(challenge.dueDate)?.getTime() < Date.now()) {
    throw new Error('Prazo do desafio encerrado');
  }

  const latestSubmission = await BoardChallengeSubmission.findOne({
    where: { userId, challengeId, journalId: challenge.journalId },
    order: [['submittedAt', 'DESC']]
  });
  if (latestSubmission?.status === 'approved') {
    throw new Error('Este desafio ja foi aprovado para este usuario');
  }

  const normalized = await normalizeSubmissionPayload(payload, challenge);
  let record;
  if (latestSubmission?.status === 'pending') {
    await latestSubmission.update({
      ...normalized,
      feedback: null,
      approvedAt: null,
      approvedBy: null,
      pointsAwarded: null,
      submittedAt: new Date()
    });
    record = latestSubmission;
  } else if (latestSubmission?.status === 'rejected') {
    if (!canUseSecondChance(challenge, latestSubmission)) {
      throw new Error('Desafio rejeitado e nao permite nova resposta');
    }
    record = await BoardChallengeSubmission.create({
      userId,
      journalId: challenge.journalId,
      challengeId,
      submittedAt: new Date(),
      status: 'pending',
      attemptNumber: Number(latestSubmission.attemptNumber || 1) + 1,
      pointsAwarded: null,
      ...normalized
    });
  } else {
    record = await BoardChallengeSubmission.create({
      userId,
      journalId: challenge.journalId,
      challengeId,
      submittedAt: new Date(),
      status: 'pending',
      attemptNumber: 1,
      pointsAwarded: null,
      ...normalized
    });
  }
  return record;
}

async function approveSubmission(submissionId, adminId, feedback = null) {
  return sequelize.transaction(async (transaction) => {
    const submission = await BoardChallengeSubmission.findByPk(submissionId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!submission) throw new Error('Submissao nao encontrada');
    if (submission.status === 'approved') throw new Error('Submissao ja aprovada');

    const challenge = await BoardChallenge.findByPk(submission.challengeId, { transaction });
    if (!challenge) throw new Error('Desafio da submissao nao encontrado');

    const pointsAwarded = getAwardedPointsForSubmission(challenge, submission);
    await submission.update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: adminId,
      feedback: normalizeString(feedback),
      pointsAwarded
    }, { transaction });

    await awardEligibleBadges(submission.userId, submission.journalId, transaction);
    return submission;
  });
}

async function rejectSubmission(submissionId, adminId, feedback = null) {
  const submission = await BoardChallengeSubmission.findByPk(submissionId);
  if (!submission) throw new Error('Submissao nao encontrada');
  if (submission.status === 'approved') throw new Error('Nao e possivel rejeitar uma submissao ja aprovada');
  await submission.update({
    status: 'rejected',
    approvedAt: new Date(),
    approvedBy: adminId,
    feedback: normalizeString(feedback),
    pointsAwarded: null
  });
  return submission;
}

async function normalizeBadgePayload(payload = {}, existing = null) {
  const journalId = normalizeString(payload.journalId || existing?.journalId);
  if (!journalId) throw new Error('Diario e obrigatorio');
  await ensureJournalExists(journalId);

  const name = normalizeString(payload.name, 100);
  if (!name) throw new Error('Nome do badge e obrigatorio');

  const badgeType = normalizeString(payload.badgeType || existing?.badgeType || 'achievement');
  if (!BADGE_TYPES.includes(badgeType)) throw new Error('Tipo de badge invalido');

  const pointsRequired = payload.pointsRequired === '' || payload.pointsRequired === null || payload.pointsRequired === undefined
    ? null
    : normalizeInteger(payload.pointsRequired, NaN);
  if (pointsRequired !== null && (!Number.isFinite(pointsRequired) || pointsRequired < 0)) {
    throw new Error('Pontuacao minima invalida');
  }

  return {
    journalId,
    name,
    description: normalizeString(payload.description),
    icon: normalizeString(payload.icon, 80),
    pointsRequired,
    badgeType,
    isActive: normalizeBoolean(payload.isActive, existing ? existing.isActive : true)
  };
}

async function getBadges(journalId, requesterId = null) {
  if (!journalId) throw new Error('Diario e obrigatorio');
  if (requesterId) await ensureJournalAccess(journalId, requesterId);
  const records = await BoardBadge.findAll({
    where: { journalId },
    order: [['pointsRequired', 'ASC'], ['name', 'ASC']]
  });
  return records.map(serializeBadge);
}
async function createBadge(payload = {}, requesterId = null) {
  const normalized = await normalizeBadgePayload(payload);
  if (requesterId) {
    await ensureJournalManagementAccess(normalized.journalId, requesterId);
  }
  const duplicated = await BoardBadge.findOne({
    where: {
      journalId: normalized.journalId,
      name: { [Op.iLike]: normalized.name }
    }
  });
  if (duplicated) throw new Error('Ja existe um badge com este nome neste diario');
  const record = await BoardBadge.create(normalized);
  return serializeBadge(record);
}

async function updateBadge(id, payload = {}, requesterId = null) {
  const record = await BoardBadge.findByPk(id);
  if (!record) throw new Error('Badge nao encontrado');
  if (requesterId) {
    await ensureJournalManagementAccess(record.journalId, requesterId);
  }
  const normalized = await normalizeBadgePayload(payload, record);
  const duplicated = await BoardBadge.findOne({
    where: {
      id: { [Op.ne]: id },
      journalId: record.journalId,
      name: { [Op.iLike]: normalized.name }
    }
  });
  if (duplicated) throw new Error('Ja existe um badge com este nome neste diario');
  await record.update(normalized);
  return serializeBadge(record);
}

async function deleteBadge(id, requesterId = null) {
  const record = await BoardBadge.findByPk(id);
  if (!record) throw new Error('Badge nao encontrado');
  if (requesterId) {
    await ensureJournalManagementAccess(record.journalId, requesterId);
  }
  await BoardUserBadge.destroy({ where: { badgeId: id } });
  await record.destroy();
}

async function getUserBadges(userId, journalId) {
  if (!journalId) throw new Error('Diario e obrigatorio');
  await ensureJournalAccess(journalId, userId);
  const records = await BoardUserBadge.findAll({
    where: { userId, journalId },
    include: [{ model: BoardBadge, as: 'badge' }],
    order: [['earnedAt', 'DESC']]
  });
  return records.map((record) => ({
    id: record.id,
    journalId: record.journalId,
    earnedAt: record.earnedAt,
    badge: record.badge ? serializeBadge(record.badge) : null
  }));
}

async function getOverallStats(journalId) {
  if (!journalId) throw new Error('Diario e obrigatorio');
  const [
    categoryCount,
    challengeCount,
    activeChallengeCount,
    pendingSubmissionCount,
    approvedSubmissionCount,
    rejectedSubmissionCount,
    badgeCount,
    earnedBadgeCount,
    approvedMembers
  ] = await Promise.all([
    BoardChallengeCategory.count({ where: { journalId } }),
    BoardChallenge.count({ where: { journalId } }),
    BoardChallenge.count({ where: { journalId, isActive: true } }),
    BoardChallengeSubmission.count({ where: { journalId, status: 'pending' } }),
    BoardChallengeSubmission.count({ where: { journalId, status: 'approved' } }),
    BoardChallengeSubmission.count({ where: { journalId, status: 'rejected' } }),
    BoardBadge.count({ where: { journalId, isActive: true } }),
    BoardUserBadge.count({ where: { journalId } }),
    BoardJournalMember.count({ where: { journalId, status: 'approved' } })
  ]);
  const totalPointsAwarded = await BoardChallengeSubmission.sum('pointsAwarded', {
    where: { journalId, status: 'approved' }
  });
  return {
    categories: categoryCount,
    challenges: challengeCount,
    activeChallenges: activeChallengeCount,
    pendingSubmissions: pendingSubmissionCount,
    approvedSubmissions: approvedSubmissionCount,
    rejectedSubmissions: rejectedSubmissionCount,
    badges: badgeCount,
    earnedBadges: earnedBadgeCount,
    participants: approvedMembers,
    totalPointsAwarded: Number(totalPointsAwarded || 0)
  };
}

async function getUserRanking(journalId, limit = 20, offset = 0) {
  if (!journalId) throw new Error('Diario e obrigatorio');
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const pointsByUser = await getApprovedPointsByUser(journalId);
  const badgeRows = await BoardUserBadge.findAll({
    where: { journalId },
    attributes: ['userId', [sequelize.fn('COUNT', sequelize.col('id')), 'badgeCount']],
    group: ['userId'],
    raw: true
  });
  const submissionRows = await BoardChallengeSubmission.findAll({
    where: { journalId },
    attributes: [
      'userId',
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = \'approved\' THEN 1 ELSE 0 END')), 'approvedCount'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = \'pending\' THEN 1 ELSE 0 END')), 'pendingCount']
    ],
    group: ['userId'],
    raw: true
  });
  const metricsByUser = {};
  submissionRows.forEach((row) => {
    metricsByUser[row.userId] = {
      approvedCount: Number(row.approvedCount || 0),
      pendingCount: Number(row.pendingCount || 0),
      badgeCount: 0,
      points: Number(pointsByUser[row.userId] || 0)
    };
  });
  badgeRows.forEach((row) => {
    metricsByUser[row.userId] = {
      ...(metricsByUser[row.userId] || { approvedCount: 0, pendingCount: 0, points: Number(pointsByUser[row.userId] || 0) }),
      badgeCount: Number(row.badgeCount || 0)
    };
  });
  const userIds = Object.keys(metricsByUser);
  if (!userIds.length) return [];
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ['id', 'name', 'email']
  });
  const ranking = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    points: Number(metricsByUser[user.id]?.points || 0),
    approvedCount: Number(metricsByUser[user.id]?.approvedCount || 0),
    pendingCount: Number(metricsByUser[user.id]?.pendingCount || 0),
    badgeCount: Number(metricsByUser[user.id]?.badgeCount || 0)
  })).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  return ranking.slice(safeOffset, safeOffset + safeLimit).map((row, index) => ({
    position: safeOffset + index + 1,
    ...row
  }));
}

async function getChallengeStats(challengeId) {
  const challenge = await getChallengeById(challengeId);
  const groupedRows = await BoardChallengeSubmission.findAll({
    where: { challengeId },
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true
  });
  const totals = groupedRows.reduce((acc, row) => {
    acc[row.status] = Number(row.count || 0);
    return acc;
  }, { pending: 0, approved: 0, rejected: 0 });
  return {
    challenge,
    totalSubmissions: totals.pending + totals.approved + totals.rejected,
    pendingSubmissions: totals.pending,
    approvedSubmissions: totals.approved,
    rejectedSubmissions: totals.rejected,
    approvalRate: totals.approved + totals.rejected > 0 ? Number(((totals.approved / (totals.approved + totals.rejected)) * 100).toFixed(2)) : 0
  };
}

async function getUserStats(userId, journalId) {
  if (!journalId) throw new Error('Diario e obrigatorio');
  const user = await User.findByPk(userId, { attributes: ['id', 'name', 'email'] });
  if (!user) throw new Error('Usuario nao encontrado');

  const [submissionRows, badgeCount, approvedChallenges, points] = await Promise.all([
    BoardChallengeSubmission.findAll({
      where: { userId, journalId },
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    }),
    BoardUserBadge.count({ where: { userId, journalId } }),
    BoardChallengeSubmission.findAll({
      where: { userId, journalId, status: 'approved' },
      attributes: ['id', 'challengeId', 'submittedAt', 'pointsAwarded'],
      include: [{ model: BoardChallenge, as: 'challenge', attributes: ['id', 'title', 'points', 'challengeType'] }],
      order: [['submittedAt', 'DESC']],
      limit: 5
    }),
    getJournalPoints(userId, journalId)
  ]);

  const totals = submissionRows.reduce((acc, row) => {
    acc[row.status] = Number(row.count || 0);
    return acc;
  }, { pending: 0, approved: 0, rejected: 0 });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      points
    },
    badges: badgeCount,
    pendingSubmissions: totals.pending,
    approvedSubmissions: totals.approved,
    rejectedSubmissions: totals.rejected,
    totalSubmissions: totals.pending + totals.approved + totals.rejected,
    latestApprovedChallenges: approvedChallenges.map((row) => ({
      id: row.id,
      submittedAt: row.submittedAt,
      pointsAwarded: row.pointsAwarded === null || row.pointsAwarded === undefined ? null : Number(row.pointsAwarded),
      challenge: row.challenge ? {
        id: row.challenge.id,
        title: row.challenge.title,
        points: row.challenge.points,
        challengeType: row.challenge.challengeType
      } : null
    }))
  };
}

module.exports = {
  ADMIN_PERMISSIONS,
  hasAdminPermission,
  canAccessBoardManagement,
  listJournals,
  getJournalById,
  createJournal,
  updateJournal,
  requestJournalAccess,
  getJournalMembers,
  approveJournalMember,
  rejectJournalMember,
  removeJournalMember,
  getChallengeCategories,
  createChallengeCategory,
  updateChallengeCategory,
  deleteChallengeCategory,
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  getPendingSubmissions,
  getSubmissionsByChallenge,
  getMySubmissions,
  createSubmission,
  approveSubmission,
  rejectSubmission,
  getBadges,
  createBadge,
  updateBadge,
  deleteBadge,
  getUserBadges,
  getOverallStats,
  getUserRanking,
  getChallengeStats,
  getUserStats,
  getJournalPoints
};
