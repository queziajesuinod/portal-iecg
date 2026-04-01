const boardJournalService = require('../services/boardJournalService');

function getCurrentUserId(req) {
  return req.user?.userId || req.user?.id || null;
}

async function canManage(req) {
  const userId = getCurrentUserId(req);
  return boardJournalService.canAccessBoardManagement(userId, req.query?.journalId || req.body?.journalId || null);
}

async function listJournals(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.listJournals(userId, { scope: req.query.scope });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar Diários' });
  }
}

async function getJournal(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.getJournalById(req.params.journalId, userId);
    res.status(200).json(data);
  } catch (error) {
    res.status(404).json({ message: error.message || 'Diario nao encontrado' });
  }
}

async function createJournal(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.createJournal(req.body, userId);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao criar diario' });
  }
}

async function updateJournal(req, res) {
  try {
    const data = await boardJournalService.updateJournal(req.params.journalId, req.body);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar diario' });
  }
}

async function requestJournalAccess(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.requestJournalAccess(req.params.journalId, userId, req.body?.note);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao solicitar acesso ao diario' });
  }
}

async function listJournalMembers(req, res) {
  try {
    const data = await boardJournalService.getJournalMembers(req.params.journalId);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao listar membros do diario' });
  }
}

async function approveJournalMember(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.approveJournalMember(req.params.journalId, req.params.memberId, userId, req.body?.note);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao aprovar acesso ao diario' });
  }
}

async function rejectJournalMember(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.rejectJournalMember(req.params.journalId, req.params.memberId, userId, req.body?.note);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao rejeitar acesso ao diario' });
  }
}

async function removeJournalMember(req, res) {
  try {
    await boardJournalService.removeJournalMember(req.params.journalId, req.params.memberId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao remover usuario do diario' });
  }
}

async function listCategories(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.getChallengeCategories(req.query.journalId, userId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar categorias' });
  }
}

async function createCategory(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.createChallengeCategory(req.body, userId);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao criar categoria' });
  }
}

async function updateCategory(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.updateChallengeCategory(req.params.id, req.body, userId);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar categoria' });
  }
}

async function deleteCategory(req, res) {
  try {
    const userId = getCurrentUserId(req);
    await boardJournalService.deleteChallengeCategory(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao remover categoria' });
  }
}

async function listChallenges(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const includeInactiveRequested = String(req.query.includeInactive || '').trim() === 'true';
    const isAdmin = includeInactiveRequested ? await canManage(req) : false;
    const data = await boardJournalService.getChallenges({
      journalId: req.query.journalId,
      categoryId: req.query.categoryId,
      search: req.query.search,
      includeInactive: includeInactiveRequested && isAdmin,
      isAdminOverride: isAdmin
    }, userId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar desafios' });
  }
}

async function getChallenge(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.getChallengeById(req.params.id, userId);
    res.status(200).json(data);
  } catch (error) {
    res.status(404).json({ message: error.message || 'Desafio nao encontrado' });
  }
}

async function createChallenge(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.createChallenge(req.body, userId);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao criar desafio' });
  }
}

async function updateChallenge(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.updateChallenge(req.params.id, req.body, userId);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar desafio' });
  }
}

async function deleteChallenge(req, res) {
  try {
    const userId = getCurrentUserId(req);
    await boardJournalService.deleteChallenge(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao remover desafio' });
  }
}

async function listPendingSubmissions(req, res) {
  try {
    const data = await boardJournalService.getPendingSubmissions({
      journalId: req.query.journalId,
      challengeId: req.query.challengeId,
      userId: req.query.userId,
      categoryId: req.query.categoryId
    });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar aprovações pendentes' });
  }
}

async function listReviewedSubmissions(req, res) {
  try {
    const data = await boardJournalService.getReviewedSubmissions({
      journalId: req.query.journalId,
      challengeId: req.query.challengeId,
      userId: req.query.userId,
      categoryId: req.query.categoryId,
      status: req.query.status
    });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar avaliacoes' });
  }
}

async function listSubmissionsByChallenge(req, res) {
  try {
    const data = await boardJournalService.getSubmissionsByChallenge(req.params.challengeId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar submissoes do desafio' });
  }
}

async function listMySubmissions(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.getMySubmissions(userId, req.query.journalId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar minhas submissoes' });
  }
}

async function createSubmission(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.createSubmission(req.body, userId);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao enviar submissao' });
  }
}

async function approveSubmission(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.approveSubmission(req.params.id, userId, req.body?.feedback);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao aprovar submissao' });
  }
}

async function rejectSubmission(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.rejectSubmission(req.params.id, userId, req.body?.feedback);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao rejeitar submissao' });
  }
}

async function updateSubmissionReview(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.updateSubmissionReview(req.params.id, userId, {
      status: req.body?.status,
      feedback: req.body?.feedback
    });
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar avaliacao da submissao' });
  }
}

async function listBadges(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.getBadges(req.query.journalId, userId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar badges' });
  }
}

async function createBadge(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.createBadge(req.body, userId);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao criar badge' });
  }
}

async function updateBadge(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.updateBadge(req.params.id, req.body, userId);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar badge' });
  }
}

async function deleteBadge(req, res) {
  try {
    const userId = getCurrentUserId(req);
    await boardJournalService.deleteBadge(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao remover badge' });
  }
}

async function listMyBadges(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.getUserBadges(userId, req.query.journalId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao listar meus badges' });
  }
}

async function getOverallStats(req, res) {
  try {
    const data = await boardJournalService.getOverallStats(req.query.journalId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao carregar indicadores' });
  }
}

async function getRanking(req, res) {
  try {
    const data = await boardJournalService.getUserRanking(req.query.journalId, req.query.limit, req.query.offset);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao carregar ranking' });
  }
}

async function getMyStats(req, res) {
  try {
    const userId = getCurrentUserId(req);
    const data = await boardJournalService.getUserStats(userId, req.query.journalId);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao carregar meus indicadores' });
  }
}

async function getUserStats(req, res) {
  try {
    const data = await boardJournalService.getUserStats(req.params.userId, req.query.journalId);
    res.status(200).json(data);
  } catch (error) {
    res.status(404).json({ message: error.message || 'Erro ao carregar indicadores do usuario' });
  }
}

async function getChallengeStats(req, res) {
  try {
    const data = await boardJournalService.getChallengeStats(req.params.challengeId);
    res.status(200).json(data);
  } catch (error) {
    res.status(404).json({ message: error.message || 'Erro ao carregar indicadores do desafio' });
  }
}

module.exports = {
  listJournals,
  getJournal,
  createJournal,
  updateJournal,
  requestJournalAccess,
  listJournalMembers,
  approveJournalMember,
  rejectJournalMember,
  removeJournalMember,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listChallenges,
  getChallenge,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  listPendingSubmissions,
  listReviewedSubmissions,
  listSubmissionsByChallenge,
  listMySubmissions,
  createSubmission,
  approveSubmission,
  rejectSubmission,
  updateSubmissionReview,
  listBadges,
  createBadge,
  updateBadge,
  deleteBadge,
  listMyBadges,
  getOverallStats,
  getRanking,
  getMyStats,
  getUserStats,
  getChallengeStats
};
