const express = require('express');
const router = express.Router();
const c = require('../controllers/cfmController');

// Escolas
router.get('/escolas', c.listEscolas);
router.post('/escolas', c.createEscola);
router.put('/escolas/:id', c.updateEscola);
router.delete('/escolas/:id', c.deleteEscola);

// Módulos (nested em escola)
router.get('/escolas/:escolaId/modulos', c.listModulos);
router.post('/escolas/:escolaId/modulos', c.createModulo);
router.put('/modulos/:id', c.updateModulo);
router.delete('/modulos/:id', c.deleteModulo);

// Matérias
router.get('/materias', c.listMaterias);
router.post('/materias', c.createMateria);
router.put('/materias/:id', c.updateMateria);
router.delete('/materias/:id', c.deleteMateria);

// Turmas
router.get('/turmas', c.listTurmas);
router.post('/turmas', c.createTurma);
router.get('/turmas/:id', c.getTurma);
router.put('/turmas/:id', c.updateTurma);
router.get('/turmas/:id/preview-delete', c.previewDeleteTurma);
router.delete('/turmas/:id', c.deleteTurma);
router.get('/turmas/:id/preview-conclusao', c.previewConclusaoTurma);
router.put('/turmas/:id/conclusao', c.concluirTurma);

// Matérias da turma (com mestres e períodos)
router.get('/turmas/:id/materias', c.getTurmaMaterias);
router.put('/turmas/:id/materias', c.syncTurmaMaterias);

// Inscrições
router.get('/turmas/:id/inscricoes', c.listInscricoes);
router.post('/turmas/:id/inscricoes', c.createInscricao);
router.put('/inscricoes/:inscricaoId/pagamento', c.confirmarPagamento);
router.put('/inscricoes/:inscricaoId/desistencia', c.marcarDesistencia);
router.put('/inscricoes/:inscricaoId/cancelar', c.cancelarInscricao);
router.get('/inscricoes/:inscricaoId/preview-conclusao', c.previewConclusao);
router.put('/inscricoes/:inscricaoId/conclusao', c.concluirInscricao);
router.put('/inscricoes/:inscricaoId/reabrir', c.reabrirInscricao);
router.put('/inscricoes/:inscricaoId/dados-formulario', c.atualizarDadosFormulario);

// Presença
router.get('/turmas/:id/presenca', c.getPresencas);
router.post('/turmas/:id/presenca', c.salvarPresencas);

// Notas
router.get('/turmas/:id/notas', c.getNotas);
router.post('/notas', c.salvarNota);
router.post('/notas/bulk', c.salvarNotasBulk);

// Painel de progresso
router.get('/turmas/:id/painel', c.getPainel);

// Aulas (listas de presença por data)
router.get('/turmas/:id/aulas', c.listarAulas);
router.post('/turmas/:id/aulas/gerar', c.gerarAulasAutomaticas);
router.post('/turmas/:id/aulas', c.criarAula);
router.delete('/aulas/:aulaId', c.deletarAula);
router.put('/aulas/:aulaId/cancelar', c.cancelarAula);
router.get('/aulas/:aulaId', c.getAulaDetalhes);
router.put('/aulas/:aulaId/presencas', c.salvarPresencasAula);

// Mensalidades
router.get('/turmas/:id/mensalidades', c.listarMensalidades);
router.post('/turmas/:id/mensalidades/gerar', c.gerarMensalidades);
router.put('/mensalidades/:mensalidadeId', c.registrarPagamentoMensalidade);

module.exports = router;
