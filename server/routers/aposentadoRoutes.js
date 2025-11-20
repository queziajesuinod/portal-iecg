const express = require('express');
const AposentadoController = require('../controllers/aposentadoController');
const MiaAttendanceController = require('../controllers/miaAttendanceController');

const router = express.Router();

router.post('/', AposentadoController.criar);
router.get('/listagemgeral', AposentadoController.listarTodos);
router.get('/attendance', MiaAttendanceController.listar);
router.post('/attendance', MiaAttendanceController.criar);
router.get('/attendance/:id', MiaAttendanceController.detalhar);
router.put('/attendance/:id/presencas', MiaAttendanceController.salvarPresencas);
router.delete('/attendance/:id', MiaAttendanceController.deletar);
router.get('/', AposentadoController.listar);
router.get('/:id', AposentadoController.buscarPorId);
router.put('/:id', AposentadoController.atualizar);
router.delete('/:id', AposentadoController.deletar);

module.exports = router;
