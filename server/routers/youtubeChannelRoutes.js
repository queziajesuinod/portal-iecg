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

module.exports = router;
