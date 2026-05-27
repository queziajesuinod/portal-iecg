const { Router } = require('express');
const express = require('express');
const controller = require('../controllers/youtubeVideoController');

const router = Router();
router.use(express.json());

router.get('/channels/:channelId/videos', controller.listarPorCanal);
router.post('/channels/:channelId/videos/sync', controller.sincronizarCanal);
router.post('/videos/:id/captions/refresh', controller.atualizarCaptions);

module.exports = router;
