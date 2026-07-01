const express = require('express');
const router = express.Router();
const c = require('../controllers/cfmController');

// Turmas abertas
router.get('/turmas', c.getTurmasAbertas);
router.get('/turmas/:turmaId', c.getTurmaPublica);

// Inscrição pública completa (formulário de matrícula)
router.post('/turmas/:turmaId/matricula', c.inscricaoPublicaCompleta);

// Inscrição simples (legado)
router.post('/turmas/:turmaId/inscricao', c.inscricaoPublica);

// Dados de apoio para o formulário
router.get('/lideres-celula', c.buscarLideresCelula);
router.get('/pastores', c.listarPastoresPublicos);
router.get('/ministerios', c.listarMinisteriosPublicos);
router.get('/redes', c.listarRedesCfm);
router.get('/escolas', c.listarEscolasPublicas);
router.get('/campi', c.listarCampiPublicos);
router.get('/membro/cpf/:cpf', c.getMembroPublicoByCpf);

module.exports = router;
