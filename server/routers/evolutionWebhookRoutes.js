const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Webhook da Evolution API (público - sem autenticação)
router.post('/evolution', notificationController.processarWebhook);

module.exports = router;
