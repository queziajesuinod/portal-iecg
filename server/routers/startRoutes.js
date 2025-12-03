const express = require('express');
const CelulaController = require('../controllers/celulaController');
const ApeloDirecionadoCelulaController = require('../controllers/apelodirecionadocelulaController');
const router = express.Router();

router.post('/celula/', CelulaController.criar);
router.get('/celula/listagemgeral', CelulaController.listarTodas);
router.get('/celula/', CelulaController.listar);
router.get('/celula/:id', CelulaController.buscarPorId);
router.put('/celula/:id', CelulaController.atualizar);
router.delete('/celula/:id', CelulaController.deletar);
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

module.exports = router;
