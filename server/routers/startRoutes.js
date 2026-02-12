const express = require('express');
const CelulaController = require('../controllers/celulaController');
const ApeloDirecionadoCelulaController = require('../controllers/apelodirecionadocelulaController');
const CelulaLeaderController = require('../controllers/celulaLeaderController');
const router = express.Router();

router.post('/celula/', CelulaController.criar);
router.get('/celula/listagemgeral', CelulaController.listarTodas);
router.get('/celula/', CelulaController.listar);
router.get('/celula/leader/contact', CelulaController.buscarPorLeaderContact);
router.get('/celula/:id', CelulaController.buscarPorId);
router.put('/celula/:id', CelulaController.atualizar);
router.delete('/celula/:id', CelulaController.deletar);
router.post('/celula/leader', CelulaLeaderController.upsertLeader);
router.post('/celula/leader/migrate', CelulaLeaderController.migrateLeaders);
router.post('/celula/leader/spouse', CelulaLeaderController.linkSpouse);
router.post('/direcionamentos/', ApeloDirecionadoCelulaController.criar);
router.get('/direcionamentos/', ApeloDirecionadoCelulaController.listarTodos);
router.get('/direcionamentos/por-celula/:celulaId', ApeloDirecionadoCelulaController.listarPorCelula);
router.get('/direcionamentos/resumo-por-celula', ApeloDirecionadoCelulaController.resumoPorCelula);
router.get('/direcionamentos/:id/historico', ApeloDirecionadoCelulaController.historico);
router.post('/direcionamentos/:id/mover', ApeloDirecionadoCelulaController.mover);
router.get('/direcionamentos/:id', ApeloDirecionadoCelulaController.buscarPorId);
router.put('/direcionamentos/:id', ApeloDirecionadoCelulaController.atualizar);
router.delete('/direcionamentos/:id', ApeloDirecionadoCelulaController.deletar);
router.post('/direcionamentos/processar-fila', ApeloDirecionadoCelulaController.processarFila);
router.use('/campus', require('./campus'));
router.get('/direcionamentos/health', ApeloDirecionadoCelulaController.healthCheck);

/**
 * GET /apelos-direcionados/fila/stats
 * Estatísticas detalhadas (alias para health)
 */
router.get('/direcionamentos/stats', ApeloDirecionadoCelulaController.getStats);

/**
 * POST /apelos-direcionados/fila/reset-monitoring
 * Reset do monitoramento (apenas admin)
 */
router.post('/direcionamentos/reset-monitoring', ApeloDirecionadoCelulaController.resetMonitoring);


module.exports = router;
