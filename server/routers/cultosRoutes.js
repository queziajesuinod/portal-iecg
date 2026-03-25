'use strict';
const { Router } = require('express');
const ministerioController = require('../controllers/ministerioController');
const tipoEventoController = require('../controllers/tipoEventoController');
const campusMinisterioController = require('../controllers/campusMinisterioController');
const registroCultoController = require('../controllers/registroCultoController');
const ministroController = require('../controllers/ministroController');

const router = Router();

// ===== Ministros (pregadores) =====
router.get('/ministros', ministroController.listar);
router.get('/ministros/:id', ministroController.buscarPorId);
router.post('/ministros', ministroController.criar);
router.put('/ministros/:id', ministroController.atualizar);
router.patch('/ministros/:id/ativo', ministroController.alternarAtivo);

// ===== Ministérios =====
router.get('/ministerios', ministerioController.listar);
router.get('/ministerios/:id', ministerioController.buscarPorId);
router.post('/ministerios', ministerioController.criar);
router.put('/ministerios/:id', ministerioController.atualizar);
router.patch('/ministerios/:id/ativo', ministerioController.alternarAtivo);

// ===== Tipos de Evento =====
router.get('/tipos-evento', tipoEventoController.listar);
router.get('/tipos-evento/:id', tipoEventoController.buscarPorId);
router.post('/tipos-evento', tipoEventoController.criar);
router.put('/tipos-evento/:id', tipoEventoController.atualizar);
router.patch('/tipos-evento/:id/ativo', tipoEventoController.alternarAtivo);

// ===== Vínculos Campus × Ministério =====
router.get('/campus/:campusId/ministerios', campusMinisterioController.listarMinisteriosPorCampus);
router.get('/campus/:campusId/vinculos', campusMinisterioController.listarVinculosPorCampus);
router.put('/campus/:campusId/vinculos', campusMinisterioController.salvarVinculos);

// ===== Registros de Culto =====
router.get('/registros', registroCultoController.listar);
router.get('/registros/dashboard', registroCultoController.dashboard);
router.get('/registros/:id', registroCultoController.buscarPorId);
router.post('/registros', registroCultoController.criar);
router.put('/registros/:id', registroCultoController.atualizar);
router.delete('/registros/:id', registroCultoController.deletar);

module.exports = router;
