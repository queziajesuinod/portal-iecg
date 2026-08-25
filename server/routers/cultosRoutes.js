const { Router } = require('express');
const ministerioController = require('../controllers/ministerioController');
const tipoEventoController = require('../controllers/tipoEventoController');
const campusMinisterioController = require('../controllers/campusMinisterioController');
const registroCultoController = require('../controllers/registroCultoController');
const ministroController = require('../controllers/ministroController');
const validacaoMinisterioController = require('../controllers/validacaoMinisterioController');
const requirePermission = require('../middlewares/requirePermission');

const router = Router();

// RBAC do modulo de cultos:
//  - CULTOS_REGISTRO: registrar culto (ver lista/detalhe, criar) + lookups do
//    formulario (tipos, ministerios, ministros incl. cadastro de convidado). Perfil Backstage.
//  - CULTOS_GESTAO: editar/excluir registro, dashboard, relatorio, validacao e
//    gestao de ministros/ministerios/tipos/campus. Perfil Gerencia_Backstage.
//  ADMIN_FULL_ACCESS libera tudo (bypass no requirePermission).
const podeRegistrar = requirePermission(['CULTOS_REGISTRO', 'CULTOS_GESTAO']);
const podeGerir = requirePermission(['CULTOS_GESTAO']);

// ===== Ministros (pregadores) =====
router.get('/ministros', podeRegistrar, ministroController.listar);
router.get('/ministros/duplicatas', podeGerir, ministroController.listarDuplicatas);
router.post('/ministros/fundir', podeGerir, ministroController.fundir);
router.get('/ministros/:id', podeRegistrar, ministroController.buscarPorId);
router.get('/ministros/:id/vinculos', podeRegistrar, ministroController.listarVinculos);
router.put('/ministros/:id/vinculos', podeRegistrar, ministroController.salvarVinculos);
// Cadastro de ministro convidado durante o registro do culto (permitido ao Backstage).
router.post('/ministros', podeRegistrar, ministroController.criar);
router.put('/ministros/:id', podeGerir, ministroController.atualizar);
router.patch('/ministros/:id/ativo', podeGerir, ministroController.alternarAtivo);

// ===== Ministérios =====
router.get('/ministerios', podeRegistrar, ministerioController.listar);
router.get('/ministerios/:id', podeRegistrar, ministerioController.buscarPorId);
router.post('/ministerios', podeGerir, ministerioController.criar);
router.put('/ministerios/:id', podeGerir, ministerioController.atualizar);
router.patch('/ministerios/:id/ativo', podeGerir, ministerioController.alternarAtivo);

// ===== Tipos de Evento =====
router.get('/tipos-evento', podeRegistrar, tipoEventoController.listar);
router.get('/tipos-evento/:id', podeRegistrar, tipoEventoController.buscarPorId);
router.post('/tipos-evento', podeGerir, tipoEventoController.criar);
router.put('/tipos-evento/:id', podeGerir, tipoEventoController.atualizar);
router.patch('/tipos-evento/:id/ativo', podeGerir, tipoEventoController.alternarAtivo);

// ===== Vínculos Campus × Ministério =====
router.get('/campus/:campusId/ministerios', podeRegistrar, campusMinisterioController.listarMinisteriosPorCampus);
router.get('/ministerios/:ministerioId/campus', podeGerir, campusMinisterioController.listarCampusPorMinisterio);
router.get('/campus/:campusId/vinculos', podeGerir, campusMinisterioController.listarVinculosPorCampus);
router.put('/campus/:campusId/vinculos', podeGerir, campusMinisterioController.salvarVinculos);
router.get('/campus/:campusId/ministerios/:ministerioId/config', podeGerir, campusMinisterioController.buscarVinculo);
router.put('/campus/:campusId/ministerios/:ministerioId/config', podeGerir, campusMinisterioController.atualizarConfiguracao);

// ===== Validação de Cultos ===== (gestão)
router.get('/validacao', podeGerir, validacaoMinisterioController.verificar);
router.post('/validacao/notificar', podeGerir, validacaoMinisterioController.notificar);
router.post('/validacao/notificar-todos', podeGerir, validacaoMinisterioController.notificarTodos);
router.post('/validacao/justificar', podeGerir, validacaoMinisterioController.justificar);
router.delete('/validacao/justificar', podeGerir, validacaoMinisterioController.removerJustificativa);

// ===== Voluntariado do usuário logado =====
router.get('/meu-voluntariado', podeRegistrar, registroCultoController.buscarMeuVoluntariado);

// ===== Registros de Culto =====
router.get('/registros', podeRegistrar, registroCultoController.listar);
router.get('/registros/dashboard', podeGerir, registroCultoController.dashboard);
router.get('/registros/relatorio-mensal', podeGerir, registroCultoController.relatorioMensal);
router.get('/registros/:id', podeRegistrar, registroCultoController.buscarPorId);
router.post('/registros', podeRegistrar, registroCultoController.criar);
router.put('/registros/:id', podeGerir, registroCultoController.atualizar);
router.delete('/registros/:id', podeGerir, registroCultoController.deletar);

module.exports = router;
