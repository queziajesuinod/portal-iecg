const express = require('express');
const CelulaController = require('../controllers/celulaController');
const ApeloDirecionadoCelulaController = require('../controllers/apelodirecionadocelulaController');
const router = express.Router();

router.post('/celula/', CelulaController.criar);
router.get('/celula/', CelulaController.listarTodas);
router.get('/celula/:id', CelulaController.buscarPorId);
router.put('/celula/:id', CelulaController.atualizar);
router.delete('/celula/:id', CelulaController.deletar);
router.post('/direcionamentos/', ApeloDirecionadoCelulaController.criar);
router.get('/direcionamentos/', ApeloDirecionadoCelulaController.listarTodos);
router.get('/direcionamentos/:id', ApeloDirecionadoCelulaController.buscarPorId);
router.put('/direcionamentos/:id', ApeloDirecionadoCelulaController.atualizar);
router.delete('/direcionamentos/:id', ApeloDirecionadoCelulaController.deletar);

module.exports = router;
