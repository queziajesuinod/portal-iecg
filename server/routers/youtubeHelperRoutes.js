const { Router } = require('express');
const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');
const multer = require('multer');
const controller = require('../controllers/youtubeHelperController');
const helperAuth = require('../middlewares/helperAuth');

const router = Router();

const uploadTmpDir = path.join(os.tmpdir(), 'iecg-helper-upload');
fs.mkdirSync(uploadTmpDir, { recursive: true });

const upload = multer({
  dest: uploadTmpDir,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /audio\/(mpeg|mp3|mp4|m4a|wav|ogg|opus|aac|flac|webm)|application\/octet-stream/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    return cb(new Error(`Tipo de arquivo nao suportado: ${file.mimetype}`));
  },
});

// Video completo (recortes/Shorts) — arquivos bem maiores que o audio.
const VIDEO_UPLOAD_LIMIT_MB = Number(process.env.HELPER_VIDEO_UPLOAD_LIMIT_MB || 2048);
const uploadVideo = multer({
  dest: uploadTmpDir,
  limits: { fileSize: VIDEO_UPLOAD_LIMIT_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /video\/(mp4|x-matroska|webm|quicktime|x-m4v)|application\/octet-stream/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    return cb(new Error(`Tipo de arquivo nao suportado: ${file.mimetype}`));
  },
});

router.use(helperAuth);

router.get('/channels', express.json(), controller.listarChannelsComPendencias);
router.get('/pending-audios', express.json(), controller.listarVideosPendentes);
router.get('/pending-videos', express.json(), controller.listarVideosParaRecorte);
router.post('/videos/:videoId/audio', upload.single('audio'), controller.uploadAudioHelper);
router.post('/videos/:videoId/video', uploadVideo.single('video'), controller.uploadVideoHelper);

module.exports = router;
