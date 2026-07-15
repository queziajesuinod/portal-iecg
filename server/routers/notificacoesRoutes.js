const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificacoesController');
const requirePermission = require('../middlewares/requirePermission');

const requireNotificacoes = requirePermission(['NOTIFICACOES_VIEW', 'ADMIN_FULL_ACCESS']);
router.use(requireNotificacoes);

// ── Grupos de audiência ───────────────────────────────────────────────────────
router.get('/grupos', ctrl.listarGrupos);
router.post('/grupos/preview', ctrl.previewFiltroLivre);
router.post('/grupos', ctrl.criarGrupo);
router.get('/grupos/:id', ctrl.buscarGrupo);
router.get('/grupos/:id/preview', ctrl.previewGrupo);
router.put('/grupos/:id', ctrl.atualizarGrupo);
router.delete('/grupos/:id', ctrl.deletarGrupo);

// ── Templates ─────────────────────────────────────────────────────────────────
router.get('/templates', ctrl.listarTemplates);
router.post('/templates', ctrl.criarTemplate);
router.get('/templates/:id', ctrl.buscarTemplate);
router.put('/templates/:id', ctrl.atualizarTemplate);
router.delete('/templates/:id', ctrl.deletarTemplate);

// ── Campanhas ─────────────────────────────────────────────────────────────────
router.get('/campanhas', ctrl.listarCampanhas);
router.post('/campanhas', ctrl.criarCampanha);
router.get('/campanhas/:id', ctrl.buscarCampanha);
router.put('/campanhas/:id', ctrl.atualizarCampanha);
router.delete('/campanhas/:id', ctrl.deletarCampanha);
router.get('/campanhas/:id/preview', ctrl.previewCampanha);
router.post('/campanhas/:id/disparar', ctrl.dispararCampanha);
router.post('/campanhas/:id/parar', ctrl.pararCampanha);
router.get('/campanhas/:id/monitor', ctrl.monitorarCampanha);
router.get('/campanhas/:id/destinatarios', ctrl.listarDestinatarios);

// ── Sequências de campanha ────────────────────────────────────────────────────
router.get('/sequencias', ctrl.listarSequencias);
router.post('/sequencias', ctrl.criarSequencia);
router.get('/sequencias/:id', ctrl.buscarSequencia);
router.put('/sequencias/:id', ctrl.atualizarSequencia);
router.delete('/sequencias/:id', ctrl.deletarSequencia);
router.post('/sequencias/:id/ativar', ctrl.ativarSequencia);
router.post('/sequencias/:id/pausar', ctrl.pausarSequencia);
router.post('/sequencias/:id/steps/:stepId/disparar', ctrl.dispararStep);
router.get('/sequencias/:id/steps/:stepId/monitor', ctrl.monitorarStep);

module.exports = router;
