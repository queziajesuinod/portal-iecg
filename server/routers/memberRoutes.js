const express = require('express');
const memberController = require('../controllers/memberController');
const requirePermission = require('../middlewares/requirePermission');

const router = express.Router();

// Autorização em camadas:
// - Rotas /me* são autosserviço (qualquer usuário autenticado edita o próprio perfil).
// - Leitura (GET: listagem, pesquisa, detalhes e KPIs) exige MEMBROS_VIEW ou ADMIN_USUARIOS.
//   Isso permite o perfil START apenas visualizar/pesquisar membros.
// - Escrita (criar/editar/apagar/fundir membros = mutações em PII) exige ADMIN_USUARIOS.
const requireMembersAdmin = requirePermission(['ADMIN_USUARIOS']);
const requireMembersRead = requirePermission(['MEMBROS_VIEW', 'ADMIN_USUARIOS']);
router.use((req, res, next) => {
  if (req.path === '/me' || req.path.startsWith('/me/')) {
    return next();
  }
  if (req.method === 'GET') {
    return requireMembersRead(req, res, next);
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
