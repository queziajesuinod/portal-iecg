const express = require('express');
const AposentadoController = require('../controllers/aposentadoController');

const router = express.Router();

router.post('/', AposentadoController.criar);
router.get('/', AposentadoController.listarTodos);
router.get('/:id', AposentadoController.buscarPorId);
router.put('/:id', AposentadoController.atualizar);
router.delete('/:id', AposentadoController.deletar);

module.exports = router;
