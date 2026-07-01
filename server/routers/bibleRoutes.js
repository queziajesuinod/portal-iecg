const express = require('express');

const router = express.Router();
const controller = require('../controllers/bibleController');

// Módulo Bíblia — busca de versículos por instrução (somente admin; auth aplicada no index.js).

router.get('/versions', controller.listVersions);
router.post('/search', controller.search);

module.exports = router;
