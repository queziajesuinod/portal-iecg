const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const batchController = require('../controllers/batchController');
const couponController = require('../controllers/couponController');
const formFieldController = require('../controllers/formFieldController');
const registrationController = require('../controllers/registrationController');
const paymentOptionController = require('../controllers/paymentOptionController');
const requirePermission = require('../middlewares/requirePermission');
const requireEventAccess = requirePermission(['EVENTS_ACESS', 'EVENTS_ACCESS', 'EVENTOS_LISTAR']);


// Middleware de autenticação (assumindo que já existe)
// const { authenticate } = require('../middlewares/auth');

router.use(requireEventAccess);

// ============= CUPONS (ANTES DE /:id) =============
router.get('/coupons', couponController.listar);
router.get('/coupons/:id', couponController.buscarPorId);
router.post('/coupons', couponController.criar);
router.put('/coupons/:id', couponController.atualizar);
router.delete('/coupons/:id', couponController.remover);

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

// ============= FORMAS DE PAGAMENTO (ANTES DE /:id) =============
router.put('/payment-options/:id', paymentOptionController.atualizar);
router.delete('/payment-options/:id', paymentOptionController.deletar);

// ============= INSCRIÇÕES (ADMIN) (ANTES DE /:id) =============
router.get('/registrations', registrationController.listar);
router.get('/registrations/:id', registrationController.buscarPorId);
router.get('/registrations/:id/cancel-info', registrationController.obterInfoCancelamento);
router.post('/registrations/:id/recalculate-status', registrationController.recalcularStatus);
router.post('/registrations/:id/cancel', registrationController.cancelar);
router.post('/registrations/:id/payments', registrationController.criarPagamento);
router.post('/registrations/:id/payments/offline', registrationController.criarPagamentoOffline);

// ============= ESTATÍSTICAS =============
router.get('/stats', eventController.estatisticas);

// ============= EVENTOS (/:id DEVE VIR POR ÚLTIMO) =============
router.get('/', eventController.listar);
router.post('/', eventController.criar);
router.post('/:id/duplicate', eventController.duplicar);
router.get('/:id', eventController.buscarPorId);
router.put('/:id', eventController.atualizar);
router.delete('/:id', eventController.remover);

// ============= ROTAS COM :eventId (DEPOIS DE /:id) =============
router.get('/:eventId/batches', batchController.listarPorEvento);
router.get('/:eventId/form-fields', formFieldController.listarPorEvento);
router.get('/:eventId/payment-options', paymentOptionController.listarPorEvento);
router.post('/:eventId/payment-options', paymentOptionController.criar);
router.get('/:eventId/registrations', registrationController.listarPorEvento);
router.get('/:eventId/registration-attendees/confirmed', registrationController.listarInscritosConfirmadosPorEvento);
router.get('/:eventId/tickets-summary', eventController.resumoIngressos);

module.exports = router;
