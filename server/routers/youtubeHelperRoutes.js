const { Router } = require('express');
const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');
const multer = require('multer');
const controller = require('../controllers/youtubeHelperController');
const helperAuth = require('../middlewares/helperAuth');

const router = Router();

// Grava o arquivo temporario no MESMO volume do destino final. Assim o
// saveVideo/saveAudio usa rename() (move instantaneo, mesmo filesystem) em vez
// de copyFile() entre filesystems. A copia cross-fs deixava a conexao HTTP
// ociosa por dezenas de segundos apos o upload — tempo suficiente pra um
// NAT/roteador/antivirus na ponta do cliente derrubar a conexao (erro 499).
const audioRoot = process.env.AUDIO_STORAGE_PATH || path.join(os.tmpdir(), 'iecg-audios');
const videoRoot = process.env.VIDEO_STORAGE_PATH || path.join(os.tmpdir(), 'iecg-videos');
const audioTmpDir = path.join(audioRoot, '.uploads-tmp');
const videoTmpDir = path.join(videoRoot, '.uploads-tmp');
fs.mkdirSync(audioTmpDir, { recursive: true });
fs.mkdirSync(videoTmpDir, { recursive: true });

const upload = multer({
  dest: audioTmpDir,
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
  dest: videoTmpDir,
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
