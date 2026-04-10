'use strict';
const { Router } = require('express');
const areaVoluntariadoController = require('../controllers/areaVoluntariadoController');
const voluntariadoController = require('../controllers/voluntariadoController');

const router = Router();

// ===== Áreas de Voluntariado =====
router.get('/areas', areaVoluntariadoController.listar);
router.get('/areas/:id', areaVoluntariadoController.buscarPorId);
router.post('/areas', areaVoluntariadoController.criar);
router.put('/areas/:id', areaVoluntariadoController.atualizar);
router.patch('/areas/:id/ativo', areaVoluntariadoController.alternarAtivo);

// ===== Voluntariados (vínculos membro × área) =====
router.get('/', voluntariadoController.listar);
router.get('/:id', voluntariadoController.buscarPorId);
router.post('/', voluntariadoController.criar);
router.put('/:id', voluntariadoController.atualizar);
router.patch('/:id/aprovar', voluntariadoController.aprovar);
router.patch('/:id/encerrar', voluntariadoController.encerrar);
router.delete('/:id', voluntariadoController.remover);

module.exports = router;
