const express = require('express');

const router = express.Router();
const controller = require('../controllers/liveQaPublicController');

// ========== ROTAS PÚBLICAS DE Q&A AO VIVO (sem autenticação) ==========

// Curtir/descurtir uma pergunta (toggle)
router.post('/questions/:questionId/like', controller.curtir);

// Entrar na sala pelo código
router.get('/:code', controller.entrar);

// Listar perguntas da sala (ordenadas por curtidas)
router.get('/:code/questions', controller.listarPerguntas);

// Pergunta destacada no momento (tela ao vivo)
router.get('/:code/live', controller.perguntaAoVivo);

// Enviar uma nova pergunta
router.post('/:code/questions', controller.criarPergunta);

module.exports = router;
