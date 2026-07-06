const { Router } = require('express');
const ministerioController = require('../controllers/ministerioController');
const tipoEventoController = require('../controllers/tipoEventoController');
const campusMinisterioController = require('../controllers/campusMinisterioController');
const registroCultoController = require('../controllers/registroCultoController');
const ministroController = require('../controllers/ministroController');
const validacaoMinisterioController = require('../controllers/validacaoMinisterioController');

const router = Router();

// ===== Ministros (pregadores) =====
router.get('/ministros', ministroController.listar);
router.get('/ministros/duplicatas', ministroController.listarDuplicatas);
router.post('/ministros/fundir', ministroController.fundir);
router.get('/ministros/:id', ministroController.buscarPorId);
router.get('/ministros/:id/vinculos', ministroController.listarVinculos);
router.put('/ministros/:id/vinculos', ministroController.salvarVinculos);
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
router.get('/ministerios/:ministerioId/campus', campusMinisterioController.listarCampusPorMinisterio);
router.get('/campus/:campusId/vinculos', campusMinisterioController.listarVinculosPorCampus);
router.put('/campus/:campusId/vinculos', campusMinisterioController.salvarVinculos);
router.get('/campus/:campusId/ministerios/:ministerioId/config', campusMinisterioController.buscarVinculo);
router.put('/campus/:campusId/ministerios/:ministerioId/config', campusMinisterioController.atualizarConfiguracao);

// ===== Validação de Cultos =====
router.get('/validacao', validacaoMinisterioController.verificar);
router.post('/validacao/notificar', validacaoMinisterioController.notificar);
router.post('/validacao/notificar-todos', validacaoMinisterioController.notificarTodos);
router.post('/validacao/justificar', validacaoMinisterioController.justificar);
router.delete('/validacao/justificar', validacaoMinisterioController.removerJustificativa);

// ===== Voluntariado do usuário logado =====
router.get('/meu-voluntariado', registroCultoController.buscarMeuVoluntariado);

// ===== Registros de Culto =====
router.get('/registros', registroCultoController.listar);
router.get('/registros/dashboard', registroCultoController.dashboard);
router.get('/registros/relatorio-mensal', registroCultoController.relatorioMensal);
router.get('/registros/:id', registroCultoController.buscarPorId);
router.post('/registros', registroCultoController.criar);
router.put('/registros/:id', registroCultoController.atualizar);
router.delete('/registros/:id', registroCultoController.deletar);

module.exports = router;
