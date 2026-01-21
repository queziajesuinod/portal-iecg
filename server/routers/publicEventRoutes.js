const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const couponController = require('../controllers/couponController');
const registrationController = require('../controllers/registrationController');
const batchController = require('../controllers/batchController');

// ============= EVENTOS PÚBLICOS =============
router.get('/', eventController.listarPublicos);
router.get('/:id', eventController.buscarPublicoPorId);
router.get('/:eventId/batches', batchController.listarPorEvento);
router.get('/:eventId/form-fields', require('../controllers/formFieldController').listarPorEvento);

// ============= VALIDAR CUPOM =============
router.post('/coupons/validate', couponController.validar);

// ============= VERIFICAR DISPONIBILIDADE =============
router.get('/batches/check-availability', batchController.verificarDisponibilidade);

// ============= PROCESSAR INSCRIÇÃO =============
router.post('/register', registrationController.processar);

// ============= CONSULTAR INSCRIÇÃO POR CÓDIGO =============
router.get('/registrations/:orderCode', registrationController.buscarPorCodigo);

module.exports = router;
