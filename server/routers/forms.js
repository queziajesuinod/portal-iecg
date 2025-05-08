const express = require('express');
const router = express.Router();
const FormController = require('../controllers/formController');
const autenticado = require('../middlewares/autenticado');

// Lista todos os formulários ativos (público ou autenticado, a seu critério)
router.get('/', FormController.listForms);

// Busca um formulário específico com campos (geralmente público)
router.get('/:id', FormController.getForm);

// Cria um novo formulário (protegido)
router.post('/', autenticado, FormController.createForm);
router.get('/payment-status/:submissionId', autenticado, FormController.getPaymentStatus);
router.post('/:submissionId/pay', autenticado, FormController.makeAdditionalPayment);

module.exports = router;
