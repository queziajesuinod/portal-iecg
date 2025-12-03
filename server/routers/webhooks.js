const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');

router.use(express.json());

router.get('/', WebhookController.list);
router.post('/', WebhookController.create);
router.patch('/:id', WebhookController.update);
router.post('/events', WebhookController.sendEvent);

module.exports = router;
