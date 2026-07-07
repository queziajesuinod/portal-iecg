const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Webhook da Evolution API (público - sem autenticação)
// Aceita /evolution e /evolution/NOME_DO_EVENTO (quando Webhook by Events está ativo)
router.post('/evolution', notificationController.processarWebhook.bind(notificationController));
router.post('/evolution/:event', notificationController.processarWebhook.bind(notificationController));

module.exports = router;
