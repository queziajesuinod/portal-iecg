const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');

// ========== ROTAS ADMINISTRATIVAS (requerem autenticação) ==========

// Agendamentos
router.post('/schedules', checkInController.criarAgendamento);
router.get('/events/:eventId/schedules', checkInController.listarAgendamentos);
router.put('/schedules/:id', checkInController.atualizarAgendamento);
router.delete('/schedules/:id', checkInController.deletarAgendamento);

// Estações
router.post('/stations', checkInController.criarEstacao);
router.get('/events/:eventId/stations', checkInController.listarEstacoes);
router.put('/stations/:id', checkInController.atualizarEstacao);
router.delete('/stations/:id', checkInController.deletarEstacao);

// Check-ins (Admin)
router.post('/manual', checkInController.realizarCheckInManual);
router.get('/events/:eventId/list', checkInController.listarCheckIns);
router.get('/events/:eventId/stats', checkInController.obterEstatisticas);

module.exports = router;
