const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const batchController = require('../controllers/batchController');
const couponController = require('../controllers/couponController');
const formFieldController = require('../controllers/formFieldController');
const registrationController = require('../controllers/registrationController');
const registrationRuleController = require('../controllers/registrationRuleController');
const paymentOptionController = require('../controllers/paymentOptionController');
const housingController = require('../controllers/housingController');
const teamsController = require('../controllers/teamsController');
const eventCoordinatorController = require('../controllers/eventCoordinatorController');
const liabilityTermController = require('../controllers/liabilityTermController');
const requirePermission = require('../middlewares/requirePermission');
const { eventVisibilityGuard } = require('../services/eventVisibility');
const requireEventAccess = requirePermission(['EVENTS_ACESS', 'EVENTS_ACCESS', 'EVENTOS_LISTAR']);
const requireCoordinatorManage = requirePermission(['EVENTS_COORDINATOR_MANAGE', 'ADMIN_FULL_ACCESS']);
const requireCouponsManage = requirePermission(['COUPONS_MANAGE']);
const requireEventVisibilityById = eventVisibilityGuard('id');

// Middleware de autenticação (assumindo que já existe)
// const { authenticate } = require('../middlewares/auth');

router.use(requireEventAccess);

// Visibilidade por perfil: qualquer rota com :eventId so passa se o usuario
// puder ver aquele evento (admin/EVENTS_VIEW_ALL veem todos; coordenador so os seus).
router.param('eventId', (req, res, next) => eventVisibilityGuard('eventId')(req, res, next));

// ============= CUPONS (ANTES DE /:id) =============
router.get('/coupons', couponController.listar);
router.get('/coupons/:id', couponController.buscarPorId);
// Criar/editar/remover cupom: somente admin (ADMIN_FULL_ACCESS) ou perfil com COUPONS_MANAGE.
router.post('/coupons', requireCouponsManage, couponController.criar);
router.put('/coupons/:id', requireCouponsManage, couponController.atualizar);
router.delete('/coupons/:id', requireCouponsManage, couponController.remover);

// ============= LOTES (ANTES DE /:id) =============
router.get('/batches/:id', batchController.buscarPorId);
router.post('/batches', batchController.criar);
router.put('/batches/:id', batchController.atualizar);
router.delete('/batches/:id', batchController.remover);

// ============= CAMPOS DE FORMULÁRIO (ANTES DE /:id) =============
router.get('/form-fields/:id', formFieldController.buscarPorId);
router.post('/form-fields', formFieldController.criar);
router.post('/form-fields/batch', formFieldController.criarEmLote);
router.put('/form-fields/:id', formFieldController.atualizar);
router.delete('/form-fields/:id', formFieldController.remover);

// ============= REGRAS DE BLOQUEIO (ANTES DE /:id) =============
router.post('/registration-rules', registrationRuleController.criar);
router.put('/registration-rules/:id', registrationRuleController.atualizar);
router.delete('/registration-rules/:id', registrationRuleController.remover);

// ============= FORMAS DE PAGAMENTO (ANTES DE /:id) =============
router.put('/payment-options/:id', paymentOptionController.atualizar);
router.delete('/payment-options/:id', paymentOptionController.deletar);

// ============= COORDENADORES DE EVENTO (ANTES DE /:id) =============
router.get('/coordinators/:id', requireCoordinatorManage, eventCoordinatorController.buscarPorId);
router.put('/coordinators/:id', requireCoordinatorManage, eventCoordinatorController.atualizar);
router.delete('/coordinators/:id', requireCoordinatorManage, eventCoordinatorController.remover);
router.get('/coordinators/:id/logs', requireCoordinatorManage, eventCoordinatorController.listarLogs);
router.post('/coordinators/:id/validate', requireCoordinatorManage, eventCoordinatorController.validar);
router.post('/coordinators/:id/send', requireCoordinatorManage, eventCoordinatorController.enviar);
router.post('/coordinators/:id/test', requireCoordinatorManage, eventCoordinatorController.enviarTeste);

// ============= INSCRIÇÕES (ADMIN) (ANTES DE /:id) =============
router.get('/registrations', registrationController.listar);
router.get('/registrations/:id', registrationController.buscarPorId);
router.get('/registrations/:id/cancel-info', registrationController.obterInfoCancelamento);
router.post('/registrations/:id/recalculate-status', registrationController.recalcularStatus);
router.post('/registrations/:id/cancel', registrationController.cancelar);
router.post('/registrations/:id/resend-ticket', registrationController.reenviarTicket);
router.put('/registrations/:id', registrationController.editarInscricao);
router.put('/registrations/:id/attendees/:attendeeId', registrationController.editarParticipante);
router.post('/registrations/:id/payments', registrationController.criarPagamento);
router.post('/registrations/:id/payments/offline', registrationController.criarPagamentoOffline);
router.put('/registrations/:id/payments/:paymentId/offline', registrationController.atualizarPagamentoOffline);
router.delete('/registrations/:id/payments/:paymentId', registrationController.removerPagamento);

// ============= ESTATÍSTICAS =============
router.get('/stats', eventController.estatisticas);

// ============= TIPOS DE EVENTO (enum do banco) =============
router.get('/event-types', eventController.tiposEvento);

// ============= EVENTOS (/:id DEVE VIR POR ÚLTIMO) =============
router.get('/', eventController.listar);
router.post('/', eventController.criar);
router.post('/:id/duplicate', requireEventVisibilityById, eventController.duplicar);
router.get('/:id', requireEventVisibilityById, eventController.buscarPorId);
router.put('/:id', requireEventVisibilityById, eventController.atualizar);
router.delete('/:id', requireEventVisibilityById, eventController.remover);

// ============= ROTAS COM :eventId (DEPOIS DE /:id) =============
router.get('/:eventId/batches', batchController.listarPorEvento);
router.get('/:eventId/form-fields', formFieldController.listarPorEvento);
router.get('/:eventId/registration-rules', registrationRuleController.listarPorEvento);
router.get('/:eventId/payment-options', paymentOptionController.listarPorEvento);
router.post('/:eventId/payment-options', paymentOptionController.criar);
router.get('/:eventId/registrations', registrationController.listarPorEvento);
router.get('/:eventId/registration-attendees/confirmed', registrationController.listarInscritosConfirmadosPorEvento);
router.get('/:eventId/tickets-summary', eventController.resumoIngressos);
router.get('/:eventId/registration-stats', eventController.estatisticasInscricoes);

// ============= HOSPEDAGEM =============
router.get('/:eventId/housing/config', housingController.getConfig);
router.get('/:eventId/housing/available-fields', housingController.getAvailableFields);
router.post('/:eventId/housing/config', housingController.saveConfig);
router.post('/:eventId/housing/instructions/improve', housingController.improveInstructions);
router.post('/:eventId/housing/generation-feedback', housingController.saveGenerationFeedback);
router.post('/:eventId/housing/generate', housingController.generate);
router.get('/:eventId/housing/allocation', housingController.getAllocation);
router.put('/:eventId/housing/allocation', housingController.saveAllocation);

// ============= TIMES =============
router.get('/:eventId/teams/config', teamsController.getConfig);
router.get('/:eventId/teams/available-fields', teamsController.getAvailableFields);
router.post('/:eventId/teams/config', teamsController.saveConfig);
router.post('/:eventId/teams/generate', teamsController.generate);
router.get('/:eventId/teams/allocation', teamsController.getAllocation);
router.put('/:eventId/teams/allocation', teamsController.saveAllocation);

// ============= TERMO DE RESPONSABILIDADE (:eventId) =============
router.get('/:eventId/liability-term', liabilityTermController.obterConfig);
router.put('/:eventId/liability-term', liabilityTermController.salvarConfig);
router.get('/:eventId/liability-term/acceptances', liabilityTermController.listarAceites);

// ============= COORDENADORES DE EVENTO (:eventId) =============
router.get('/:eventId/coordinators', requireCoordinatorManage, eventCoordinatorController.listarPorEvento);
router.post('/:eventId/coordinators', requireCoordinatorManage, eventCoordinatorController.criar);
router.get('/:eventId/coordinators/field-options', requireCoordinatorManage, eventCoordinatorController.opcoesCampos);

module.exports = router;
