const express = require('express');

const router = express.Router();
const ctrl = require('../controllers/celulaPresencaController');

// Célula do líder autenticado (deve vir antes de /:celulaId para não conflitar)
router.get('/minha-celula', ctrl.minhacelula.bind(ctrl));

// Membros vinculados à célula
router.get('/:celulaId/membros', ctrl.listarMembros.bind(ctrl));
router.post('/:celulaId/membros', ctrl.vincularMembro.bind(ctrl));
router.patch('/:celulaId/membros/:membroId', ctrl.editarMembro.bind(ctrl));
router.delete('/:celulaId/membros/:membroId', ctrl.desvincularMembro.bind(ctrl));

// Busca de membros candidatos a vincular
router.get('/:celulaId/membros-candidatos', ctrl.buscarMembrosCandidatos.bind(ctrl));

// Cadastro rápido de membro + vínculo imediato
router.post('/:celulaId/membros/cadastrar', ctrl.cadastrarEVincularMembro.bind(ctrl));

// Reuniões — sugestão e confirmação
router.get('/:celulaId/reunioes/sugestoes', ctrl.sugerirReunioes.bind(ctrl));
router.post('/:celulaId/reunioes/confirmar', ctrl.confirmarReunioes.bind(ctrl));
router.delete('/:celulaId/reunioes/agendadas', ctrl.excluirReunioesAgendadas.bind(ctrl));

// Reuniões — CRUD
router.get('/:celulaId/reunioes', ctrl.listarReunioes.bind(ctrl));
router.post('/:celulaId/reunioes', ctrl.criarReuniaoManual.bind(ctrl));
router.delete('/reunioes/:reuniaoId', ctrl.excluirReuniao.bind(ctrl));
router.patch('/reunioes/:reuniaoId/cancelar', ctrl.cancelarReuniao.bind(ctrl));
router.patch('/reunioes/:reuniaoId/reabrir', ctrl.reabrirReuniao.bind(ctrl));
router.patch('/reunioes/:reuniaoId', ctrl.editarReuniao.bind(ctrl));

// Presença
router.get('/reunioes/:reuniaoId/presenca', ctrl.obterPresencaReuniao.bind(ctrl));
router.post('/reunioes/:reuniaoId/presenca', ctrl.registrarPresenca.bind(ctrl));
router.post('/reunioes/:reuniaoId/presenca/avulso', ctrl.adicionarPresencaAvulsa.bind(ctrl));

// Transferência de membro entre células
router.post('/:celulaId/membros/:membroId/transferir', ctrl.transferirMembro.bind(ctrl));

// Estatísticas do membro na célula
router.get('/:celulaId/membros/:membroId/stats', ctrl.estatisticasMembro.bind(ctrl));

// Pré-cadastros (visitantes / frequentadores)
router.patch('/:celulaId/pre-cadastros/:preCadastroId', ctrl.atualizarTipoPreCadastro.bind(ctrl));
router.post('/:celulaId/pre-cadastros/:preCadastroId/promover', ctrl.promoverPreCadastro.bind(ctrl));

module.exports = router;
