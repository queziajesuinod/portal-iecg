const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// ========== GRUPOS ==========
router.post('/groups', notificationController.criarGrupo);
router.get('/events/:eventId/groups', notificationController.listarGrupos);
router.post('/groups/:groupId/members', notificationController.adicionarMembrosAoGrupo);
router.delete('/groups/:groupId/members/:registrationId', notificationController.removerMembroDoGrupo);
router.post('/groups/from-schedule', notificationController.criarGrupoPorAgendamento);

// ========== TEMPLATES ==========
router.post('/templates', notificationController.criarTemplate);
router.get('/templates', notificationController.listarTemplates);
router.put('/templates/:id', notificationController.atualizarTemplate);
router.delete('/templates/:id', notificationController.deletarTemplate);

// ========== NOTIFICAÇÕES ==========
router.post('/send', notificationController.enviarNotificacao);
router.post('/groups/:groupId/send', notificationController.enviarNotificacaoParaGrupo);
router.get('/events/:eventId/list', notificationController.listarNotificacoes);
router.get('/events/:eventId/stats', notificationController.obterEstatisticas);

module.exports = router;
