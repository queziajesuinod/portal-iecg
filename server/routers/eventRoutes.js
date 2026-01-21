const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const batchController = require('../controllers/batchController');
const couponController = require('../controllers/couponController');
const formFieldController = require('../controllers/formFieldController');
const registrationController = require('../controllers/registrationController');
const paymentOptionController = require('../controllers/paymentOptionController');

// Middleware de autenticação (assumindo que já existe)
// const { authenticate } = require('../middlewares/auth');

// ============= EVENTOS =============
router.get('/', eventController.listar);
router.get('/:id', eventController.buscarPorId);
router.post('/', eventController.criar);
router.put('/:id', eventController.atualizar);
router.delete('/:id', eventController.remover);

// ============= LOTES =============
router.get('/:eventId/batches', batchController.listarPorEvento);
router.get('/batches/:id', batchController.buscarPorId);
router.post('/batches', batchController.criar);
router.put('/batches/:id', batchController.atualizar);
router.delete('/batches/:id', batchController.remover);

// ============= CUPONS =============
router.get('/coupons', couponController.listar);
router.get('/coupons/:id', couponController.buscarPorId);
router.post('/coupons', couponController.criar);
router.put('/coupons/:id', couponController.atualizar);
router.delete('/coupons/:id', couponController.remover);

// ============= CAMPOS DE FORMULÁRIO =============
router.get('/:eventId/form-fields', formFieldController.listarPorEvento);
router.get('/form-fields/:id', formFieldController.buscarPorId);
router.post('/form-fields', formFieldController.criar);
router.post('/form-fields/batch', formFieldController.criarEmLote);
router.put('/form-fields/:id', formFieldController.atualizar);
router.delete('/form-fields/:id', formFieldController.remover);

// ============= FORMAS DE PAGAMENTO =============
router.get('/:eventId/payment-options', paymentOptionController.listarPorEvento);
router.post('/:eventId/payment-options', paymentOptionController.criar);
router.put('/payment-options/:id', paymentOptionController.atualizar);
router.delete('/payment-options/:id', paymentOptionController.deletar);

// ============= INSCRIÇÕES (ADMIN) =============
router.get('/registrations', registrationController.listar);
router.get('/:eventId/registrations', registrationController.listarPorEvento);
router.get('/registrations/:id', registrationController.buscarPorId);
router.post('/registrations/:id/cancel', registrationController.cancelar);

module.exports = router;
