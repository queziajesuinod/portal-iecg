const express = require('express');
const memberController = require('../controllers/memberController');
const requirePermission = require('../middlewares/requirePermission');

const router = express.Router();

// Autorização: as rotas /me* são autosserviço (qualquer usuário autenticado edita o
// próprio perfil). Todo o resto (listar/ler/editar/apagar membros = PII) exige ADMIN_USUARIOS.
const requireMembersAdmin = requirePermission(['ADMIN_USUARIOS']);
router.use((req, res, next) => {
  if (req.path === '/me' || req.path.startsWith('/me/')) {
    return next();
  }
  return requireMembersAdmin(req, res, next);
});

router.get('/stats', memberController.stats);
router.get('/duplicates', memberController.listPossibleDuplicates);
router.post('/duplicates/merge', memberController.mergeDuplicates);
router.post('/duplicates/dismiss', memberController.dismissDuplicate);
router.get('/activity-types', memberController.listActivityTypes);
router.post('/activity-types', memberController.createActivityType);
router.put('/activity-types/:typeId', memberController.updateActivityType);
router.patch('/activity-types/:typeId/active', memberController.setActivityTypeActive);
router.get('/me', memberController.getMe);
router.get('/me/spouse-candidates', memberController.listMySpouseCandidates);
router.patch('/me/profile', memberController.updateMyProfile);
router.get('/', memberController.list);
router.get('/:id', memberController.getById);
router.post('/:id/activities', memberController.addActivity);
router.delete('/:id/activities/:activityId', memberController.deleteActivity);
router.get('/:id/cargos', memberController.listCargos);
router.post('/:id/cargos', memberController.addCargo);
router.delete('/:id/cargos/:cargo', memberController.removeCargo);
router.post('/:id/milestones', memberController.addMilestone);
router.post('/:id/notificar-dados', memberController.notificarDadosIncompletos);
router.post('/:id/notificar-celulas', memberController.notificarCelulasLider);
router.post('/:id/sync-from-user', memberController.syncFromUser);
router.patch('/:id/journey', memberController.updateJourney);
router.post('/', memberController.create);
router.put('/:id', memberController.update);
router.delete('/:id', memberController.remove);

module.exports = router;
