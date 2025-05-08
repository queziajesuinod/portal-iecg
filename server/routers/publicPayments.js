const express = require('express');
const router = express.Router();
const PublicPaymentController = require('../controllers/publicPaymentController');

router.get('/por-cpf/:cpf', PublicPaymentController.getPaymentsByCpf);

module.exports = router;
