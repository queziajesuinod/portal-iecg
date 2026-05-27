const { Router } = require('express');
const express = require('express');
const controller = require('../controllers/videoTranscriptController');

const router = Router();
router.use(express.json());

router.get('/transcripts', controller.listar);
router.get('/transcripts/:id', controller.buscarPorId);
router.put('/transcripts/:id', controller.atualizar);
router.delete('/transcripts/:id', controller.remover);

router.post('/transcripts/enqueue', controller.enfileirar);
router.post('/transcripts/:id/cancel', controller.cancelar);
router.post('/transcripts/:id/summarize', controller.regerarResumo);
router.post('/videos/:videoId/transcribe', controller.processarAgora);

router.get('/worker/status', controller.statusWorker);
router.post('/worker/run-once', controller.rodarWorkerAgora);

module.exports = router;
