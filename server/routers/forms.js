const express = require('express');
const router = express.Router();
const FormController = require('../controllers/formController');
const autenticado = require('../middlewares/autenticado');
const FormSubmissionController = require('../controllers/formSubmissionController');


// Lista todos os formulários ativos (público ou autenticado, a seu critério)
router.get('/', FormController.listForms);

// Busca um formulário específico com campos (geralmente público)
router.get('/:id', FormController.getForm);

// Cria um novo formulário (protegido)
router.post('/', autenticado, FormController.createForm);
router.put('/:id', autenticado, FormController.updateForm);
router.delete('/:id', autenticado, FormController.deleteForm);
router.get('/payment-status/:submissionId', autenticado, FormController.getPaymentStatus);
router.post('/:submissionId/pay', autenticado, FormController.makeAdditionalPayment);
router.post('/:formId/submit', FormSubmissionController.create);

module.exports = router;
