'use strict';
const { Router } = require('express');
const controller = require('../controllers/publicVoluntariadoController');

const router = Router();

// GET /api/public/voluntariado/areas — lista áreas ativas
router.get('/areas', controller.listarAreas);

// GET /api/public/voluntariado/campus — lista campus ativos
router.get('/campus', controller.listarCampus);

// GET /api/public/voluntariado/campus/:campusId/ministerios — lista ministérios do campus
router.get('/campus/:campusId/ministerios', controller.listarMinisteriosPorCampus);

// POST /api/public/voluntariado — cadastra voluntário
router.post('/', controller.cadastrarVoluntario);

module.exports = router;
