const express = require('express');

const router = express.Router();
const ctrl = require('../controllers/notificacoesController');

// Pixel de rastreamento de abertura de e-mail (público, sem autenticação).
// Chamado pelo cliente de e-mail do destinatário ao carregar a imagem.
router.get('/track/open/:recipientId', ctrl.trackOpen);

module.exports = router;
