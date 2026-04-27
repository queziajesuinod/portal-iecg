const express = require('express');
const boardJournalController = require('../controllers/boardJournalController');
const requirePermission = require('../middlewares/requirePermission');
const boardJournalService = require('../services/boardJournalService');

const router = express.Router();
const requireBoardAdmin = requirePermission(['DIARIO_BORDO_ADMIN']);
const requireBoardManagementAccess = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const journalId = req.body?.journalId || req.query?.journalId || null;
    const canAccess = await boardJournalService.canAccessBoardManagement(userId, journalId);
    if (!canAccess) {
      return res.status(403).json({ message: 'Usuario sem permissao para gerenciar diarios' });
    }
    return next();
  } catch (error) {
    return res.status(403).json({ message: error.message || 'Usuario sem permissao para gerenciar diarios' });
  }
};

router.get('/journals', boardJournalController.listJournals);
router.get('/journals/:journalId', boardJournalController.getJournal);
router.post('/journals', requireBoardAdmin, boardJournalController.createJournal);
router.put('/journals/:journalId', requireBoardAdmin, boardJournalController.updateJournal);
router.post('/journals/:journalId/request-access', boardJournalController.requestJournalAccess);
router.post('/journals/:journalId/members/manual', requireBoardAdmin, boardJournalController.addJournalMemberManually);
router.get('/journals/:journalId/members', requireBoardAdmin, boardJournalController.listJournalMembers);
router.put('/journals/:journalId/members/:memberId/approve', requireBoardAdmin, boardJournalController.approveJournalMember);
router.put('/journals/:journalId/members/:memberId/reject', requireBoardAdmin, boardJournalController.rejectJournalMember);
router.delete('/journals/:journalId/members/:memberId', requireBoardAdmin, boardJournalController.removeJournalMember);

router.get('/categories', boardJournalController.listCategories);
router.post('/categories', requireBoardManagementAccess, boardJournalController.createCategory);
router.put('/categories/:id', requireBoardManagementAccess, boardJournalController.updateCategory);
router.delete('/categories/:id', requireBoardManagementAccess, boardJournalController.deleteCategory);

router.get('/challenges', boardJournalController.listChallenges);
router.get('/challenges/:id', boardJournalController.getChallenge);
router.post('/challenges', requireBoardManagementAccess, boardJournalController.createChallenge);
router.put('/challenges/:id', requireBoardManagementAccess, boardJournalController.updateChallenge);
router.delete('/challenges/:id', requireBoardManagementAccess, boardJournalController.deleteChallenge);

router.get('/submissions/me', boardJournalController.listMySubmissions);
router.post('/submissions', boardJournalController.createSubmission);
router.get('/submissions/pending', requireBoardAdmin, boardJournalController.listPendingSubmissions);
router.get('/submissions/reviewed', requireBoardAdmin, boardJournalController.listReviewedSubmissions);
router.get('/submissions/challenge/:challengeId', requireBoardAdmin, boardJournalController.listSubmissionsByChallenge);
router.put('/submissions/:id/approve', requireBoardAdmin, boardJournalController.approveSubmission);
router.put('/submissions/:id/reject', requireBoardAdmin, boardJournalController.rejectSubmission);
router.put('/submissions/:id/review', requireBoardAdmin, boardJournalController.updateSubmissionReview);

router.get('/badges', boardJournalController.listBadges);
router.get('/badges/me', boardJournalController.listMyBadges);
router.post('/badges', requireBoardManagementAccess, boardJournalController.createBadge);
router.put('/badges/:id', requireBoardManagementAccess, boardJournalController.updateBadge);
router.delete('/badges/:id', requireBoardManagementAccess, boardJournalController.deleteBadge);

router.get('/analytics/stats', requireBoardAdmin, boardJournalController.getOverallStats);
router.get('/analytics/ranking', boardJournalController.getRanking);
router.get('/analytics/me', boardJournalController.getMyStats);
router.get('/analytics/user/:userId', requireBoardAdmin, boardJournalController.getUserStats);
router.get('/analytics/challenge/:challengeId', requireBoardAdmin, boardJournalController.getChallengeStats);

module.exports = router;
