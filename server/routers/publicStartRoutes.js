const express = require('express');
const ApeloDirecionadoCelulaController = require('../controllers/apelodirecionadocelulaController');
const CelulaPublicController = require('../controllers/celulaPublicController');

const router = express.Router();

// Rota publica para criar apelo direcionado (sem autenticacao)
router.post('/direcionamentos', ApeloDirecionadoCelulaController.criar);
// Consulta publica de celula por email ou cel_lider
router.get('/celulas/contato', CelulaPublicController.buscarPorContato);
// Atualizacao publica de dados da celula
router.put('/celulas/:id', CelulaPublicController.atualizar);

module.exports = router;
