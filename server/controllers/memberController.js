const memberService = require('../services/memberService');

function sanitizeMemberPayload(payload = {}) {
  const allowedFields = [
    'userId',
    'fullName',
    'preferredName',
    'cpf',
    'rg',
    'birthDate',
    'gender',
    'maritalStatus',
    'phone',
    'whatsapp',
    'email',
    'zipCode',
    'street',
    'number',
    'complement',
    'neighborhood',
    'city',
    'state',
    'country',
    'membershipDate',
    'baptismDate',
    'baptismPlace',
    'conversionDate',
    'status',
    'statusReason',
    'campusId',
    'celulaId',
    'spouseMemberId',
    'photoUrl',
    'notes'
  ];

  return allowedFields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
}

function sanitizeActivityPayload(payload = {}) {
  const allowedFields = [
    'activityType',
    'activityTypeId',
    'activityDate',
    'points',
    'metadata',
    'eventId',
    'celulaId',
    'courseId'
  ];

  return allowedFields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
}

function sanitizeMilestonePayload(payload = {}) {
  const allowedFields = [
    'milestoneTypeId',
    'milestoneType',
    'achievedDate',
    'description',
    'certificateUrl'
  ];

  return allowedFields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
}

function sanitizeJourneyPayload(payload = {}) {
  const allowedFields = [
    'currentStage',
    'stageChangedAt',
    'engagementScore',
    'lastActivityDate',
    'daysInactive',
    'healthStatus',
    'suggestedNextSteps',
    'alerts',
    'interests',
    'spiritualGifts'
  ];

  return allowedFields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
}

function sanitizeOwnProfilePayload(payload = {}) {
  const allowedFields = [
    'fullName',
    'cpf',
    'birthDate',
    'gender',
    'maritalStatus',
    'phone',
    'whatsapp',
    'email',
    'zipCode',
    'street',
    'number',
    'complement',
    'neighborhood',
    'city',
    'state',
    'country',
    'spouseMemberId',
    'baptismDate',
    'baptismPlace',
    'conversionDate',
    'photoUrl'
  ];

  return allowedFields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
}

function sanitizeActivityTypePayload(payload = {}) {
  const allowedFields = [
    'code',
    'name',
    'description',
    'category',
    'defaultPoints',
    'isSystem',
    'isActive',
    'sortOrder'
  ];

  return allowedFields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
}

async function list(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 5000);
    const filters = {};
    ['status', 'campusId', 'celulaId', 'search'].forEach((key) => {
      const value = req.query[key];
      if (value && value !== 'undefined') {
        filters[key] = value;
      }
    });

    const result = await memberService.listMembers(filters, { page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao listar membros:', error);
    res.status(500).json({ message: error.message || 'Erro ao listar membros' });
  }
}

async function getById(req, res) {
  try {
    const member = await memberService.getMemberById(req.params.id);
    res.status(200).json(member);
  } catch (error) {
    res.status(404).json({ message: error.message || 'Membro não encontrado' });
  }
}

async function getMe(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const member = await memberService.getMemberByUserId(userId);
    res.status(200).json(member);
  } catch (error) {
    res.status(404).json({ message: error.message || 'Membro nao encontrado' });
  }
}

async function listMySpouseCandidates(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const candidates = await memberService.listSpouseCandidatesByUserId(userId);
    res.status(200).json(candidates);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao listar possiveis conjuges' });
  }
}

async function create(req, res) {
  try {
    const createdBy = req.user?.userId || req.user?.id || null;
    const payload = sanitizeMemberPayload(req.body);
    const member = await memberService.createMember(payload, createdBy);
    res.status(201).json(member);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao criar membro' });
  }
}

async function update(req, res) {
  try {
    const updatedBy = req.user?.userId || req.user?.id || null;
    const payload = sanitizeMemberPayload(req.body);
    const member = await memberService.updateMember(req.params.id, payload, updatedBy);
    res.status(200).json(member);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar membro' });
  }
}

async function updateMyProfile(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const payload = sanitizeOwnProfilePayload(req.body);
    const member = await memberService.updateOwnProfileByUserId(userId, payload);
    res.status(200).json(member);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar perfil do membro' });
  }
}

async function remove(req, res) {
  try {
    await memberService.deleteMember(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao excluir membro' });
  }
}

async function stats(req, res) {
  try {
    const campusId = req.query.campusId || null;
    const result = await memberService.getStatistics(campusId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao obter estatísticas' });
  }
}

async function addActivity(req, res) {
  try {
    const createdBy = req.user?.userId || req.user?.id || null;
    const payload = sanitizeActivityPayload(req.body);
    const activity = await memberService.addActivity(req.params.id, payload, createdBy);
    res.status(201).json(activity);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao registrar atividade' });
  }
}

async function deleteActivity(req, res) {
  try {
    await memberService.deleteActivity(req.params.id, req.params.activityId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao excluir atividade' });
  }
}

async function addMilestone(req, res) {
  try {
    const createdBy = req.user?.userId || req.user?.id || null;
    const payload = sanitizeMilestonePayload(req.body);
    const milestone = await memberService.addMilestone(req.params.id, payload, createdBy);
    res.status(201).json(milestone);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao registrar marco' });
  }
}

async function updateJourney(req, res) {
  try {
    const payload = sanitizeJourneyPayload(req.body);
    const journey = await memberService.updateJourney(req.params.id, payload);
    res.status(200).json(journey);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar jornada' });
  }
}

async function listActivityTypes(req, res) {
  try {
    const activityTypes = await memberService.listActivityTypes({
      includeInactive: req.query.includeInactive
    });
    res.status(200).json(activityTypes);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar tipos de atividade' });
  }
}

async function createActivityType(req, res) {
  try {
    const createdBy = req.user?.userId || req.user?.id || null;
    const payload = sanitizeActivityTypePayload(req.body);
    const activityType = await memberService.createActivityType(payload, createdBy);
    res.status(201).json(activityType);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao criar tipo de atividade' });
  }
}

async function updateActivityType(req, res) {
  try {
    const payload = sanitizeActivityTypePayload(req.body);
    const activityType = await memberService.updateActivityType(req.params.typeId, payload);
    res.status(200).json(activityType);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar tipo de atividade' });
  }
}

async function setActivityTypeActive(req, res) {
  try {
    const isActive = req.body?.isActive;
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ message: 'Campo isActive deve ser booleano' });
      return;
    }
    const activityType = await memberService.setActivityTypeActive(req.params.typeId, isActive);
    res.status(200).json(activityType);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar status do tipo de atividade' });
  }
}

async function listPossibleDuplicates(req, res) {
  try {
    const result = await memberService.listPossibleDuplicates();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar membros duplicados' });
  }
}

async function mergeDuplicates(req, res) {
  try {
    const mergedBy = req.user?.userId || req.user?.id || null;
    const { memberIdA, memberIdB } = req.body || {};
    if (!memberIdA || !memberIdB) {
      res.status(400).json({ message: 'Informe memberIdA e memberIdB' });
      return;
    }

    const result = await memberService.mergeDuplicateMembers(memberIdA, memberIdB, mergedBy);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao fundir membros duplicados' });
  }
}

async function dismissDuplicate(req, res) {
  try {
    const dismissedBy = req.user?.userId || req.user?.id || null;
    const { memberIdA, memberIdB } = req.body || {};
    if (!memberIdA || !memberIdB) {
      res.status(400).json({ message: 'Informe memberIdA e memberIdB' });
      return;
    }

    const result = await memberService.dismissDuplicateSuggestion(memberIdA, memberIdB, dismissedBy);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao desconsiderar sugestao de duplicidade' });
  }
}

module.exports = {
  list,
  getById,
  getMe,
  listMySpouseCandidates,
  create,
  update,
  updateMyProfile,
  remove,
  stats,
  listPossibleDuplicates,
  mergeDuplicates,
  dismissDuplicate,
  addActivity,
  deleteActivity,
  addMilestone,
  updateJourney,
  listActivityTypes,
  createActivityType,
  updateActivityType,
  setActivityTypeActive
};
