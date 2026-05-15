const BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

function headers() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

// Membros vinculados
export const listarMembrosVinculados = (celulaId) => request('GET', `/api/admin/celulas-presenca/${celulaId}/membros`);
export const vincularMembro = (celulaId, body) => request('POST', `/api/admin/celulas-presenca/${celulaId}/membros`, body);
export const desvincularMembro = (celulaId, membroId) => request('DELETE', `/api/admin/celulas-presenca/${celulaId}/membros/${membroId}`);
export const cadastrarEVincularMembro = (celulaId, body) => request('POST', `/api/admin/celulas-presenca/${celulaId}/membros/cadastrar`, body);
export const buscarMembrosCandidatos = (celulaId, q = '') => {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return request('GET', `/api/admin/celulas-presenca/${celulaId}/membros-candidatos${qs}`);
};

// Reuniões — sugestão e confirmação
export const sugerirReunioes = (celulaId, semanas = 8) => request('GET', `/api/admin/celulas-presenca/${celulaId}/reunioes/sugestoes?semanas=${semanas}`);
export const confirmarReunioes = (celulaId, datas) => request('POST', `/api/admin/celulas-presenca/${celulaId}/reunioes/confirmar`, { datas });
export const excluirReunioesAgendadas = (celulaId) => request('DELETE', `/api/admin/celulas-presenca/${celulaId}/reunioes/agendadas`);

export const excluirReuniao = (reuniaoId) => request('DELETE', `/api/admin/celulas-presenca/reunioes/${reuniaoId}`);
export const reabrirReuniao = (reuniaoId) => request('PATCH', `/api/admin/celulas-presenca/reunioes/${reuniaoId}/reabrir`);

// Reuniões — CRUD
export const listarReunioes = (celulaId, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/api/admin/celulas-presenca/${celulaId}/reunioes${qs ? `?${qs}` : ''}`);
};
export const criarReuniaoManual = (celulaId, body) => request('POST', `/api/admin/celulas-presenca/${celulaId}/reunioes`, body);
export const cancelarReuniao = (reuniaoId, body) => request('PATCH', `/api/admin/celulas-presenca/reunioes/${reuniaoId}/cancelar`, body);
export const editarReuniao = (reuniaoId, body) => request('PATCH', `/api/admin/celulas-presenca/reunioes/${reuniaoId}`, body);

// Presença
export const obterPresencaReuniao = (reuniaoId) => request('GET', `/api/admin/celulas-presenca/reunioes/${reuniaoId}/presenca`);
export const registrarPresenca = (reuniaoId, presencas) => request('POST', `/api/admin/celulas-presenca/reunioes/${reuniaoId}/presenca`, { presencas });
export const adicionarPresencaAvulsa = (reuniaoId, body) => request('POST', `/api/admin/celulas-presenca/reunioes/${reuniaoId}/presenca/avulso`, body);

// Transferência entre células
export const transferirMembro = (celulaId, membroId, body) => request('POST', `/api/admin/celulas-presenca/${celulaId}/membros/${membroId}/transferir`, body);

// Pré-cadastros (visitantes / frequentadores)
export const atualizarTipoPreCadastro = (celulaId, preCadastroId, tipo) => request('PATCH', `/api/admin/celulas-presenca/${celulaId}/pre-cadastros/${preCadastroId}`, { tipo });
export const promoverPreCadastro = (celulaId, preCadastroId) => request('POST', `/api/admin/celulas-presenca/${celulaId}/pre-cadastros/${preCadastroId}/promover`);

// Stats
export const estatisticasMembro = (celulaId, membroId) => request('GET', `/api/admin/celulas-presenca/${celulaId}/membros/${membroId}/stats`);

// Busca células para seleção (transferência, vínculo etc.)
export const buscarCelulasParaSelecao = async ({ q = '', rede = '' } = {}) => {
  const token = localStorage.getItem('token');
  const apiUrl = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
  const params = new URLSearchParams({ ...(q ? { celula: q } : {}), limit: 40, page: 1 });
  if (rede) params.append('rede', rede);
  const res = await fetch(`${apiUrl}/start/celula?${params.toString()}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return Array.isArray(data.registros) ? data.registros : (Array.isArray(data) ? data : []);
};
