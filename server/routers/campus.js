const { Router } = require('express');
const express = require('express');
const controller = require('../controllers/campus');

const router = Router();
router.use(express.json());

router.get('/', controller.listar);
router.post('/', controller.criar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.remover);

module.exports = router;
