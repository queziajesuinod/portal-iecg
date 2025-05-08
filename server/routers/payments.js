// routes/payments.js
const express = require('express');
const router = express.Router();
const autenticado = require('../middlewares/autenticado');
const PaymentController = require('../controllers/paymentController');

router.get('/:id/history', autenticado, PaymentController.getHistory);

module.exports = router;
