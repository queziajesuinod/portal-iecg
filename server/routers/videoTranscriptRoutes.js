const { Router } = require('express');
const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
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
  const requestId = crypto.randomUUID();
  req.uploadRequestId = requestId;
  req.uploadStartedAt = Date.now();
  const contentLength = req.headers['content-length'] || 'unknown';
  console.log(`[uploadAudio][${requestId}] start videoId=${req.params.videoId} ip=${req.ip} contentLength=${contentLength}`);

  upload.single('audio')(req, res, (err) => {
    if (!err) {
      console.log(
        `[uploadAudio][${requestId}] multer_ok videoId=${req.params.videoId} originalName=${req.file?.originalname || 'n/a'} mimetype=${req.file?.mimetype || 'n/a'} size=${req.file?.size || 0}`
      );
      return next();
    }
    console.error(`[uploadAudio][${requestId}] multer_error videoId=${req.params.videoId} code=${err.code || 'n/a'} message=${err.message}`);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Arquivo excede o limite de 500MB' });
    }
    return res.status(400).json({ message: err.message || 'Falha no upload de audio' });
  });
}

router.get('/transcripts', express.json(), controller.listar);
router.get('/transcripts/speakers', express.json(), controller.listarSpeakers);
router.get('/transcripts/progress', express.json(), controller.buscarProgressoBatch);
router.get('/transcripts/:id/progress', express.json(), controller.buscarProgresso);
router.get('/transcripts/:id', express.json(), controller.buscarPorId);
router.put('/transcripts/:id', express.json(), controller.atualizar);
router.delete('/transcripts/:id', express.json(), controller.remover);

router.post('/transcripts/:id/cancel', express.json(), controller.cancelar);
router.post('/transcripts/:id/summarize', express.json(), controller.regerarResumo);
router.post('/transcripts/:id/webhook/resend', express.json(), controller.reenviarWebhook);

router.post('/videos/:videoId/audio', uploadAudioMiddleware, controller.uploadAudio);
router.get('/videos/:videoId/audio', controller.baixarAudio);
router.post('/videos/:videoId/transcribe', express.json(), controller.transcribeUploadedAudio);

router.get('/worker/status', express.json(), controller.statusWorker);
router.post('/worker/run-once', express.json(), controller.rodarWorkerAgora);

module.exports = router;
