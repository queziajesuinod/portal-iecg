'use strict';
const { Router } = require('express');
const controller = require('../controllers/publicVoluntariadoController');

const router = Router();

// GET /api/public/voluntariado/areas — lista áreas ativas (sem autenticação)
router.get('/areas', controller.listarAreas);

// POST /api/public/voluntariado — cadastra voluntário (sem autenticação)
router.post('/', controller.cadastrarVoluntario);

module.exports = router;
