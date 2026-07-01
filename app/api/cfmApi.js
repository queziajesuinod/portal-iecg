import axios from 'axios';

const ADMIN = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api/admin/cfm`
  : `${window.location.origin}/api/admin/cfm`;

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── ESCOLAS ───────────────────────────────────────────────────────────────
export const listEscolas = () => axios.get(`${ADMIN}/escolas`, { headers: getAuthHeader() }).then(r => r.data);
export const createEscola = (data) => axios.post(`${ADMIN}/escolas`, data, { headers: getAuthHeader() }).then(r => r.data);
export const updateEscola = (id, data) => axios.put(`${ADMIN}/escolas/${id}`, data, { headers: getAuthHeader() }).then(r => r.data);
export const deleteEscola = (id) => axios.delete(`${ADMIN}/escolas/${id}`, { headers: getAuthHeader() }).then(r => r.data);

// ─── MÓDULOS ───────────────────────────────────────────────────────────────
export const listModulos = (escolaId) => axios.get(`${ADMIN}/escolas/${escolaId}/modulos`, { headers: getAuthHeader() }).then(r => r.data);
export const createModulo = (escolaId, data) => axios.post(`${ADMIN}/escolas/${escolaId}/modulos`, data, { headers: getAuthHeader() }).then(r => r.data);
export const updateModulo = (id, data) => axios.put(`${ADMIN}/modulos/${id}`, data, { headers: getAuthHeader() }).then(r => r.data);
export const deleteModulo = (id) => axios.delete(`${ADMIN}/modulos/${id}`, { headers: getAuthHeader() }).then(r => r.data);

// ─── MATÉRIAS ──────────────────────────────────────────────────────────────
export const listMaterias = (params) => axios.get(`${ADMIN}/materias`, { params, headers: getAuthHeader() }).then(r => r.data);
export const createMateria = (data) => axios.post(`${ADMIN}/materias`, data, { headers: getAuthHeader() }).then(r => r.data);
export const updateMateria = (id, data) => axios.put(`${ADMIN}/materias/${id}`, data, { headers: getAuthHeader() }).then(r => r.data);
export const deleteMateria = (id) => axios.delete(`${ADMIN}/materias/${id}`, { headers: getAuthHeader() }).then(r => r.data);

// ─── TURMAS ────────────────────────────────────────────────────────────────
export const listTurmas = (params) => axios.get(`${ADMIN}/turmas`, { params, headers: getAuthHeader() }).then(r => r.data);
export const getTurma = (id) => axios.get(`${ADMIN}/turmas/${id}`, { headers: getAuthHeader() }).then(r => r.data);
export const createTurma = (data) => axios.post(`${ADMIN}/turmas`, data, { headers: getAuthHeader() }).then(r => r.data);
export const updateTurma = (id, data) => axios.put(`${ADMIN}/turmas/${id}`, data, { headers: getAuthHeader() }).then(r => r.data);
export const previewDeleteTurma = (id) => axios.get(`${ADMIN}/turmas/${id}/preview-delete`, { headers: getAuthHeader() }).then(r => r.data);
export const deleteTurma = (id) => axios.delete(`${ADMIN}/turmas/${id}`, { headers: getAuthHeader() }).then(r => r.data);
export const getListaPresencaImpressao = (id) => axios.get(`${ADMIN}/turmas/${id}/lista-presenca`, { headers: getAuthHeader() }).then(r => r.data);

// ─── TURMA MATÉRIAS ────────────────────────────────────────────────────────
export const getTurmaMaterias = (turmaId) => axios.get(`${ADMIN}/turmas/${turmaId}/materias`, { headers: getAuthHeader() }).then(r => r.data);
export const syncTurmaMaterias = (turmaId, materias) => axios.put(`${ADMIN}/turmas/${turmaId}/materias`, { materias }, { headers: getAuthHeader() }).then(r => r.data);

// ─── INSCRIÇÕES ────────────────────────────────────────────────────────────
export const listInscricoes = (turmaId) => axios.get(`${ADMIN}/turmas/${turmaId}/inscricoes`, { headers: getAuthHeader() }).then(r => r.data);
export const createInscricao = (turmaId, data) => axios.post(`${ADMIN}/turmas/${turmaId}/inscricoes`, data, { headers: getAuthHeader() }).then(r => r.data);
export const confirmarPagamento = (inscricaoId, data) => axios.put(`${ADMIN}/inscricoes/${inscricaoId}/pagamento`, data, { headers: getAuthHeader() }).then(r => r.data);
export const marcarDesistencia = (inscricaoId) => axios.put(`${ADMIN}/inscricoes/${inscricaoId}/desistencia`, {}, { headers: getAuthHeader() }).then(r => r.data);
export const cancelarInscricao = (inscricaoId) => axios.put(`${ADMIN}/inscricoes/${inscricaoId}/cancelar`, {}, { headers: getAuthHeader() }).then(r => r.data);
export const previewConclusao = (inscricaoId) => axios.get(`${ADMIN}/inscricoes/${inscricaoId}/preview-conclusao`, { headers: getAuthHeader() }).then(r => r.data);
export const concluirInscricao = (inscricaoId) => axios.put(`${ADMIN}/inscricoes/${inscricaoId}/conclusao`, {}, { headers: getAuthHeader() }).then(r => r.data);
export const reabrirInscricao = (inscricaoId) => axios.put(`${ADMIN}/inscricoes/${inscricaoId}/reabrir`, {}, { headers: getAuthHeader() }).then(r => r.data);
export const previewConclusaoTurma = (turmaId) => axios.get(`${ADMIN}/turmas/${turmaId}/preview-conclusao`, { headers: getAuthHeader() }).then(r => r.data);
export const concluirTurma = (turmaId) => axios.put(`${ADMIN}/turmas/${turmaId}/conclusao`, {}, { headers: getAuthHeader() }).then(r => r.data);
export const enviarBoletimTurma = (turmaId) => axios.post(`${ADMIN}/turmas/${turmaId}/enviar-boletim`, {}, { headers: getAuthHeader() }).then(r => r.data);
export const enviarBoletimInscricao = (inscricaoId) => axios.post(`${ADMIN}/inscricoes/${inscricaoId}/enviar-boletim`, {}, { headers: getAuthHeader() }).then(r => r.data);

// ─── PRESENÇA ──────────────────────────────────────────────────────────────
export const getPresencas = (turmaId, params) => axios.get(`${ADMIN}/turmas/${turmaId}/presenca`, { params, headers: getAuthHeader() }).then(r => r.data);
export const salvarPresencas = (turmaId, registros) => axios.post(`${ADMIN}/turmas/${turmaId}/presenca`, { registros }, { headers: getAuthHeader() }).then(r => r.data);

// ─── NOTAS ─────────────────────────────────────────────────────────────────
export const getNotas = (turmaId) => axios.get(`${ADMIN}/turmas/${turmaId}/notas`, { headers: getAuthHeader() }).then(r => r.data);
export const salvarNota = (data) => axios.post(`${ADMIN}/notas`, data, { headers: getAuthHeader() }).then(r => r.data);
export const salvarNotasBulk = (notas) => axios.post(`${ADMIN}/notas/bulk`, { notas }, { headers: getAuthHeader() }).then(r => r.data);

// ─── PAINEL ────────────────────────────────────────────────────────────────
export const getPainel = (turmaId) => axios.get(`${ADMIN}/turmas/${turmaId}/painel`, { headers: getAuthHeader() }).then(r => r.data);

// ─── AULAS ─────────────────────────────────────────────────────────────────
export const listarAulas = (turmaId) => axios.get(`${ADMIN}/turmas/${turmaId}/aulas`, { headers: getAuthHeader() }).then(r => r.data);
export const gerarAulasAutomaticas = (turmaId) => axios.post(`${ADMIN}/turmas/${turmaId}/aulas/gerar`, {}, { headers: getAuthHeader() }).then(r => r.data);
export const criarAula = (turmaId, data) => axios.post(`${ADMIN}/turmas/${turmaId}/aulas`, data, { headers: getAuthHeader() }).then(r => r.data);
export const deletarAula = (aulaId) => axios.delete(`${ADMIN}/aulas/${aulaId}`, { headers: getAuthHeader() }).then(r => r.data);
export const getAulaDetalhes = (aulaId) => axios.get(`${ADMIN}/aulas/${aulaId}`, { headers: getAuthHeader() }).then(r => r.data);
export const salvarPresencasAula = (aulaId, presencas) => axios.put(`${ADMIN}/aulas/${aulaId}/presencas`, { presencas }, { headers: getAuthHeader() }).then(r => r.data);
export const cancelarAula = (aulaId, data) => axios.put(`${ADMIN}/aulas/${aulaId}/cancelar`, data, { headers: getAuthHeader() }).then(r => r.data);

// ─── MENSALIDADES ──────────────────────────────────────────────────────────
export const listarMensalidades = (turmaId) => axios.get(`${ADMIN}/turmas/${turmaId}/mensalidades`, { headers: getAuthHeader() }).then(r => r.data);
export const gerarMensalidades = (turmaId) => axios.post(`${ADMIN}/turmas/${turmaId}/mensalidades/gerar`, {}, { headers: getAuthHeader() }).then(r => r.data);
export const registrarPagamentoMensalidade = (mensalidadeId, data) => axios.put(`${ADMIN}/mensalidades/${mensalidadeId}`, data, { headers: getAuthHeader() }).then(r => r.data);

// ─── DADOS DE FORMULÁRIO (inscrição) ──────────────────────────────────────
export const atualizarDadosFormulario = (inscricaoId, dados) => axios.put(`${ADMIN}/inscricoes/${inscricaoId}/dados-formulario`, dados, { headers: getAuthHeader() }).then(r => r.data);
export const enviarCartaoAluno = (inscricaoId) => axios.post(`${ADMIN}/inscricoes/${inscricaoId}/enviar-cartao`, {}, { headers: getAuthHeader() }).then(r => r.data);
export const enviarCartoesTurma = (turmaId) => axios.post(`${ADMIN}/turmas/${turmaId}/enviar-cartoes`, {}, { headers: getAuthHeader() }).then(r => r.data);

// ─── DADOS DE APOIO (reutilizados no admin) ───────────────────────────────
const PUBLIC_CFM = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/cfm`;
export const listarMinisterios = () => axios.get(`${PUBLIC_CFM}/redes`).then(r => r.data);
export const listarPastoresCfm = () => axios.get(`${PUBLIC_CFM}/pastores`).then(r => r.data);
export const buscarLideresCelulaSearch = (busca) => axios.get(`${PUBLIC_CFM}/lideres-celula`, { params: { busca } }).then(r => r.data);

// ─── TIPOS DE ATIVIDADE (MemberActivityTypes) ──────────────────────────────
const MEMBERS_BASE = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api/admin/members`
  : `${window.location.origin}/api/admin/members`;

export const listActivityTypes = () => axios.get(`${MEMBERS_BASE}/activity-types`, { headers: getAuthHeader() }).then(r => r.data);

// Busca membros por nome/email — retorna array direto para uso em autocomplete
export const searchMembers = (search, limit = 15) => axios.get(MEMBERS_BASE, { params: { search, limit }, headers: getAuthHeader() })
  .then(r => r.data.members || []);
