const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');
const webhookEventDefinitionController = require('../controllers/webhookEventDefinitionController');

router.use(express.json());

router.get('/', WebhookController.list);
router.post('/', WebhookController.create);
router.patch('/:id', WebhookController.update);
router.get('/event-definitions', webhookEventDefinitionController.list);
router.post('/event-definitions', webhookEventDefinitionController.create);
router.post('/events', WebhookController.sendEvent);
router.get('/resend/events/:eventId/registrations', WebhookController.listarInscricoesParaReenvio);
router.post('/resend/registrations', WebhookController.reenviarWebhookInscricoes);

module.exports = router;
