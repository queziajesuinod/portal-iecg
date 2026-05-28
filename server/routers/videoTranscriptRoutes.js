const { Router } = require('express');
const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');
const multer = require('multer');
const controller = require('../controllers/videoTranscriptController');

const router = Router();

const uploadTmpDir = path.join(os.tmpdir(), 'iecg-audio-upload');
fs.mkdirSync(uploadTmpDir, { recursive: true });

const upload = multer({
  dest: uploadTmpDir,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = /audio\/(mpeg|mp3|mp4|m4a|wav|ogg|opus|aac|flac|webm)|application\/octet-stream/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    return cb(new Error(`Tipo de arquivo nao suportado: ${file.mimetype}`));
  },
});

function uploadAudioMiddleware(req, res, next) {
  upload.single('audio')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Arquivo excede o limite de 500MB' });
    }
    return res.status(400).json({ message: err.message || 'Falha no upload de audio' });
  });
}

router.get('/transcripts', express.json(), controller.listar);
router.get('/transcripts/progress', express.json(), controller.buscarProgressoBatch);
router.get('/transcripts/:id/progress', express.json(), controller.buscarProgresso);
router.get('/transcripts/:id', express.json(), controller.buscarPorId);
router.put('/transcripts/:id', express.json(), controller.atualizar);
router.delete('/transcripts/:id', express.json(), controller.remover);

router.post('/transcripts/:id/cancel', express.json(), controller.cancelar);
router.post('/transcripts/:id/summarize', express.json(), controller.regerarResumo);
router.post('/transcripts/:id/webhook/resend', express.json(), controller.reenviarWebhook);

router.post('/videos/:videoId/audio', uploadAudioMiddleware, controller.uploadAudio);
router.post('/videos/:videoId/transcribe', express.json(), controller.transcribeUploadedAudio);

router.get('/worker/status', express.json(), controller.statusWorker);
router.post('/worker/run-once', express.json(), controller.rodarWorkerAgora);

module.exports = router;
