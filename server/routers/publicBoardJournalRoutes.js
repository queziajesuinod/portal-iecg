'use strict';

const { Router } = require('express');
const controller = require('../controllers/publicBoardJournalController');

const router = Router();

// GET /api/public/diario-bordo/respostas?email=X&journalId=Y — perguntas respondidas (aprovadas)
router.get('/respostas', controller.getAnswered);

// GET /api/public/diario-bordo/pendentes?email=X&journalId=Y — perguntas ainda não respondidas
router.get('/pendentes', controller.getPending);

// POST /api/public/diario-bordo/perguntas — inserir nova pergunta/desafio
router.post('/perguntas', controller.createChallenge);

// POST /api/public/diario-bordo/submissoes — enviar resposta a uma pergunta pelo e-mail
router.post('/submissoes', controller.createSubmission);

module.exports = router;
