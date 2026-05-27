const { Router } = require('express');
const express = require('express');
const controller = require('../controllers/youtubeChannelController');

const router = Router();
router.use(express.json());

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.remover);

router.post('/oauth/start', controller.iniciarOAuth);

router.get('/:id/cookies', controller.statusCookies);
router.put('/:id/cookies', express.json({ limit: '2mb' }), controller.salvarCookies);
router.delete('/:id/cookies', controller.removerCookies);

module.exports = router;
