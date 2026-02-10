const express = require('express');
const ApeloDirecionadoCelulaController = require('../controllers/apelodirecionadocelulaController');
const CelulaPublicController = require('../controllers/celulaPublicController');
const CampusController = require('../controllers/campus');
const CelulaController = require('../controllers/celulaController');
const CelulaLeaderPublicController = require('../controllers/celulaLeaderPublicController');

const router = express.Router();

// Rota publica para criar apelo direcionado (sem autenticacao)
router.post('/direcionamentos', ApeloDirecionadoCelulaController.criar);
// Rota publica para cadastrar uma celula (sem autenticacao)
router.post('/celulas', CelulaPublicController.criar);
// Rota publica de listagem de campus
router.get('/campus', CampusController.listar);
// Consulta publica de celula por email ou cel_lider
router.get('/celulas/contato', CelulaPublicController.buscarPorContato);
// Atualizacao publica de dados da celula
router.put('/celulas/:id', CelulaPublicController.atualizar);
router.post('/celulas/leader', CelulaLeaderPublicController.upsertLeader);
router.post('/celulas/leader/spouse', CelulaLeaderPublicController.linkSpouse);
router.get('/celulas/leader/contact', CelulaController.buscarPorLeaderContact);
const PublicUserController = require('../controllers/publicUserController');
router.get('/users/:id', PublicUserController.getLeaderById);

module.exports = router;
