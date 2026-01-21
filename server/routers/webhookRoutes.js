const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Webhook da Cielo para notificações de pagamento
router.post('/cielo', webhookController.cieloWebhook);

module.exports = router;
