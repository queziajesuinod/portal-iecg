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

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  stats
};
