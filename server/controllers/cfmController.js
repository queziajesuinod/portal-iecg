const cfm = require('../services/cfmService');

function ok(res, data) { return res.json(data); }
function err(res, e, status = 500) { return res.status(status).json({ erro: e.message }); }

// ─── ESCOLAS ───────────────────────────────────────────────────────────────

exports.listEscolas = async (req, res) => {
  try { ok(res, await cfm.listEscolas()); } catch (e) { err(res, e); }
};
exports.createEscola = async (req, res) => {
  try { ok(res, await cfm.createEscola(req.body)); } catch (e) { err(res, e); }
};
exports.updateEscola = async (req, res) => {
  try { ok(res, await cfm.updateEscola(req.params.id, req.body)); } catch (e) { err(res, e); }
};
exports.deleteEscola = async (req, res) => {
  try { await cfm.deleteEscola(req.params.id); ok(res, { ok: true }); } catch (e) { err(res, e); }
};

// ─── MÓDULOS ───────────────────────────────────────────────────────────────

exports.listModulos = async (req, res) => {
  try { ok(res, await cfm.listModulos(req.params.escolaId)); } catch (e) { err(res, e); }
};
exports.createModulo = async (req, res) => {
  try { ok(res, await cfm.createModulo(req.params.escolaId, req.body)); } catch (e) { err(res, e); }
};
exports.updateModulo = async (req, res) => {
  try { ok(res, await cfm.updateModulo(req.params.id, req.body)); } catch (e) { err(res, e); }
};
exports.deleteModulo = async (req, res) => {
  try { await cfm.deleteModulo(req.params.id); ok(res, { ok: true }); } catch (e) { err(res, e); }
};

// ─── MATÉRIAS ──────────────────────────────────────────────────────────────

exports.listMaterias = async (req, res) => {
  try {
    const { escolaId, moduloId } = req.query;
    ok(res, await cfm.listMaterias({ escolaId, moduloId }));
  } catch (e) { err(res, e); }
};
exports.createMateria = async (req, res) => {
  try { ok(res, await cfm.createMateria(req.body)); } catch (e) { err(res, e); }
};
exports.updateMateria = async (req, res) => {
  try { ok(res, await cfm.updateMateria(req.params.id, req.body)); } catch (e) { err(res, e); }
};
exports.deleteMateria = async (req, res) => {
  try { await cfm.deleteMateria(req.params.id); ok(res, { ok: true }); } catch (e) { err(res, e); }
};

// ─── TURMAS ────────────────────────────────────────────────────────────────

exports.listTurmas = async (req, res) => {
  try { ok(res, await cfm.listTurmas(req.query)); } catch (e) { err(res, e); }
};
exports.getTurma = async (req, res) => {
  try { ok(res, await cfm.getTurma(req.params.id)); } catch (e) { err(res, e); }
};
exports.createTurma = async (req, res) => {
  try { ok(res, await cfm.createTurma(req.body)); } catch (e) { err(res, e); }
};
exports.updateTurma = async (req, res) => {
  try { ok(res, await cfm.updateTurma(req.params.id, req.body)); } catch (e) { err(res, e); }
};
exports.previewDeleteTurma = async (req, res) => {
  try { ok(res, await cfm.previewDeleteTurma(req.params.id)); } catch (e) { err(res, e); }
};

exports.deleteTurma = async (req, res) => {
  try { await cfm.deleteTurma(req.params.id); ok(res, { ok: true }); } catch (e) { err(res, e); }
};

// ─── TURMA MATÉRIAS ────────────────────────────────────────────────────────

exports.getTurmaMaterias = async (req, res) => {
  try { ok(res, await cfm.getTurmaMaterias(req.params.id)); } catch (e) { err(res, e); }
};
exports.listaPresencaImpressao = async (req, res) => {
  try { ok(res, await cfm.getListaPresencaImpressao(req.params.id)); } catch (e) { err(res, e, e.status || 500); }
};
exports.syncTurmaMaterias = async (req, res) => {
  try { ok(res, await cfm.syncTurmaMaterias(req.params.id, req.body.materias)); } catch (e) { err(res, e); }
};

// ─── INSCRIÇÕES ────────────────────────────────────────────────────────────

exports.listInscricoes = async (req, res) => {
  try { ok(res, await cfm.listInscricoes(req.params.id)); } catch (e) { err(res, e); }
};
exports.createInscricao = async (req, res) => {
  try { ok(res, await cfm.createInscricao({ ...req.body, turmaId: req.params.id })); } catch (e) { err(res, e, 400); }
};
exports.confirmarPagamento = async (req, res) => {
  try { ok(res, await cfm.confirmarPagamento(req.params.inscricaoId, req.body)); } catch (e) { err(res, e, 400); }
};
exports.marcarDesistencia = async (req, res) => {
  try { ok(res, await cfm.marcarDesistencia(req.params.inscricaoId)); } catch (e) { err(res, e, 400); }
};
exports.cancelarInscricao = async (req, res) => {
  try { ok(res, await cfm.cancelarInscricao(req.params.inscricaoId)); } catch (e) { err(res, e, 400); }
};
exports.previewConclusao = async (req, res) => {
  try { ok(res, await cfm.previewConclusao(req.params.inscricaoId)); } catch (e) { err(res, e, 400); }
};

exports.concluirInscricao = async (req, res) => {
  try { ok(res, await cfm.concluirInscricao(req.params.inscricaoId)); } catch (e) { err(res, e, 400); }
};

exports.reabrirInscricao = async (req, res) => {
  try { ok(res, await cfm.reabrirInscricao(req.params.inscricaoId)); } catch (e) { err(res, e, 400); }
};
exports.previewConclusaoTurma = async (req, res) => {
  try { ok(res, await cfm.previewConclusaoTurma(req.params.id)); } catch (e) { err(res, e, 400); }
};
exports.concluirTurma = async (req, res) => {
  try { ok(res, await cfm.concluirTurma(req.params.id)); } catch (e) { err(res, e, 400); }
};
exports.enviarBoletimTurma = async (req, res) => {
  try {
    const boletimSvc = require('../services/cfmBoletimEmailService');
    ok(res, await boletimSvc.enviarBoletimTurma(req.params.id));
  } catch (e) { err(res, e, 500); }
};
exports.enviarBoletimInscricao = async (req, res) => {
  try {
    const boletimSvc = require('../services/cfmBoletimEmailService');
    ok(res, await boletimSvc.enviarBoletimInscricao(req.params.inscricaoId));
  } catch (e) { err(res, e, 500); }
};

// ─── PRESENÇA ──────────────────────────────────────────────────────────────

exports.getPresencas = async (req, res) => {
  try {
    const { turmaMateriaId, data } = req.query;
    ok(res, await cfm.getPresencas({ turmaId: req.params.id, turmaMateriaId, data }));
  } catch (e) { err(res, e); }
};
exports.salvarPresencas = async (req, res) => {
  try { ok(res, await cfm.salvarPresencas(req.body.registros)); } catch (e) { err(res, e, 400); }
};

// ─── NOTAS ─────────────────────────────────────────────────────────────────

exports.getNotas = async (req, res) => {
  try { ok(res, await cfm.getNotas(req.params.id)); } catch (e) { err(res, e); }
};
exports.salvarNota = async (req, res) => {
  try { ok(res, await cfm.salvarNota(req.body)); } catch (e) { err(res, e, 400); }
};
exports.salvarNotasBulk = async (req, res) => {
  try { ok(res, await cfm.salvarNotasBulk(req.body.notas)); } catch (e) { err(res, e, 400); }
};

// ─── PAINEL ────────────────────────────────────────────────────────────────

exports.getPainel = async (req, res) => {
  try { ok(res, await cfm.getPainel(req.params.id)); } catch (e) { err(res, e); }
};

// ─── AULAS ─────────────────────────────────────────────────────────────────

exports.listarAulas = async (req, res) => {
  try { ok(res, await cfm.listarAulas(req.params.id)); } catch (e) { err(res, e); }
};
exports.gerarAulasAutomaticas = async (req, res) => {
  try { ok(res, await cfm.gerarAulasAutomaticas(req.params.id)); } catch (e) { err(res, e, 400); }
};
exports.criarAula = async (req, res) => {
  try { ok(res, await cfm.criarAula(req.params.id, req.body)); } catch (e) { err(res, e, 400); }
};
exports.deletarAula = async (req, res) => {
  try { await cfm.deletarAula(req.params.aulaId); ok(res, { ok: true }); } catch (e) { err(res, e, 400); }
};
exports.cancelarAula = async (req, res) => {
  try { ok(res, await cfm.cancelarAula(req.params.aulaId, req.body)); } catch (e) { err(res, e, 400); }
};
exports.getAulaDetalhes = async (req, res) => {
  try { ok(res, await cfm.getAulaDetalhes(req.params.aulaId)); } catch (e) { err(res, e); }
};
exports.salvarPresencasAula = async (req, res) => {
  try { ok(res, await cfm.salvarPresencasAula(req.params.aulaId, req.body.presencas)); } catch (e) { err(res, e, 400); }
};

// ─── MENSALIDADES ──────────────────────────────────────────────────────────

exports.listarMensalidades = async (req, res) => {
  try { ok(res, await cfm.listarMensalidades(req.params.id)); } catch (e) { err(res, e); }
};
exports.gerarMensalidades = async (req, res) => {
  try { ok(res, await cfm.gerarMensalidades(req.params.id)); } catch (e) { err(res, e, 400); }
};
exports.registrarPagamentoMensalidade = async (req, res) => {
  try { ok(res, await cfm.registrarPagamentoMensalidade(req.params.mensalidadeId, req.body)); } catch (e) { err(res, e, 400); }
};

// ─── INSCRIÇÃO PÚBLICA ──────────────────────────────────────────────────────

exports.inscricaoPublica = async (req, res) => {
  try { ok(res, await cfm.inscricaoPublica(req.params.turmaId, req.body)); } catch (e) { err(res, e, 400); }
};
exports.inscricaoPublicaCompleta = async (req, res) => {
  try { ok(res, await cfm.inscricaoPublicaCompleta(req.params.turmaId, req.body)); } catch (e) { err(res, e, 400); }
};
exports.getTurmaPublica = async (req, res) => {
  try {
    const t = await cfm.getTurma(req.params.turmaId);
    if (!t) { res.status(404).json({ erro: 'Turma não encontrada' }); return; }
    ok(res, { turma: t });
  } catch (e) { err(res, e); }
};
exports.getTurmasAbertas = async (req, res) => {
  try { ok(res, await cfm.getTurmasAbertas()); } catch (e) { err(res, e); }
};
exports.buscarLideresCelula = async (req, res) => {
  try { ok(res, await cfm.buscarLideresCelula(req.query.busca)); } catch (e) { err(res, e); }
};
exports.listarPastoresPublicos = async (req, res) => {
  try { ok(res, await cfm.listarPastoresPublicos()); } catch (e) { err(res, e); }
};
exports.getMembroPublicoByCpf = async (req, res) => {
  try {
    const dados = await cfm.getMembroPublicoByCpf(req.params.cpf);
    if (!dados) { res.status(404).json({ erro: 'CPF não encontrado' }); return; }
    ok(res, dados);
  } catch (e) { err(res, e); }
};
exports.listarMinisteriosPublicos = async (req, res) => {
  try { ok(res, await cfm.listarMinisteriosPublicos()); } catch (e) { err(res, e); }
};
exports.listarRedesCfm = async (req, res) => {
  try { ok(res, await cfm.listarRedesCfm()); } catch (e) { err(res, e); }
};
exports.listarEscolasPublicas = async (req, res) => {
  try { ok(res, await cfm.listarEscolasPublicas()); } catch (e) { err(res, e); }
};
exports.listarCampiPublicos = async (req, res) => {
  try { ok(res, await cfm.listarCampiPublicos()); } catch (e) { err(res, e); }
};
exports.atualizarDadosFormulario = async (req, res) => {
  try { ok(res, await cfm.atualizarDadosFormulario(req.params.inscricaoId, req.body)); } catch (e) { err(res, e, 400); }
};

// ─── CFM CHECK-IN ──────────────────────────────────────────────────────────

exports.cfmCheckinScan = async (req, res) => {
  try {
    const resultado = await cfm.scanCfmCheckin(req.body.tokenQr);
    ok(res, resultado);
  } catch (e) {
    err(res, e, e.status || 500);
  }
};

exports.cfmCheckinMarcar = async (req, res) => {
  try {
    const { tokenQr, turmaMateriaId } = req.body;
    if (!turmaMateriaId) { res.status(400).json({ erro: 'turmaMateriaId obrigatório' }); return; }
    const resultado = await cfm.marcarCfmCheckin(tokenQr, turmaMateriaId);
    ok(res, resultado);
  } catch (e) {
    err(res, e, e.status || 500);
  }
};

exports.enviarCartaoAluno = async (req, res) => {
  try { ok(res, await cfm.enviarCartaoInscricao(req.params.inscricaoId)); } catch (e) { err(res, e, e.status || 500); }
};
exports.enviarCartoesTurma = async (req, res) => {
  try { ok(res, await cfm.enviarCartoesTurma(req.params.id)); } catch (e) { err(res, e, 500); }
};
