// API helper — Módulo Saúde e Fluxo de Cultos
import { fetchWithAuth } from 'utils/authSession';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const API_URL = resolveApiUrl();
const BASE = `${API_URL}/api/admin/cultos`;

const appendFiltros = (params, filtros = {}) => {
  Object.entries(filtros).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.filter((item) => item != null && item !== '').forEach((item) => params.append(k, item));
      return;
    }
    if (v != null && v !== '') params.append(k, v);
  });
};

// ===== Ministros (pregadores) =====
export const listarMinistros = (apenasAtivos = false, campusId = null, ministerioId = null) => {
  const params = new URLSearchParams();
  if (apenasAtivos) params.set('ativo', 'true');
  if (campusId) params.set('campusId', campusId);
  if (ministerioId) params.set('ministerioId', ministerioId);
  const qs = params.toString();
  return fetchWithAuth(`${BASE}/ministros${qs ? `?${qs}` : ''}`);
};

export const criarMinistro = (dados) => fetchWithAuth(`${BASE}/ministros`, { method: 'POST', body: JSON.stringify(dados) });

export const atualizarMinistro = (id, dados) => fetchWithAuth(`${BASE}/ministros/${id}`, { method: 'PUT', body: JSON.stringify(dados) });

export const alternarAtivoMinistro = (id) => fetchWithAuth(`${BASE}/ministros/${id}/ativo`, { method: 'PATCH' });

export const listarDuplicatasMinistros = () => fetchWithAuth(`${BASE}/ministros/duplicatas`);

export const fundirMinistros = (manterId, fundirIds) => fetchWithAuth(`${BASE}/ministros/fundir`, { method: 'POST', body: JSON.stringify({ manterId, fundirIds }) });

export const listarVinculosMinistro = (id) => fetchWithAuth(`${BASE}/ministros/${id}/vinculos`);

export const salvarVinculosMinistro = (id, vinculos) => fetchWithAuth(`${BASE}/ministros/${id}/vinculos`, { method: 'PUT', body: JSON.stringify({ vinculos }) });

// ===== Ministérios =====
export const listarMinisterios = (apenasAtivos = false) => fetchWithAuth(`${BASE}/ministerios${apenasAtivos ? '?ativo=true' : ''}`);

export const criarMinisterio = (dados) => fetchWithAuth(`${BASE}/ministerios`, { method: 'POST', body: JSON.stringify(dados) });

export const atualizarMinisterio = (id, dados) => fetchWithAuth(`${BASE}/ministerios/${id}`, { method: 'PUT', body: JSON.stringify(dados) });

export const alternarAtivoMinisterio = (id) => fetchWithAuth(`${BASE}/ministerios/${id}/ativo`, { method: 'PATCH' });

// ===== Tipos de Evento =====
export const listarTiposEvento = (apenasAtivos = false) => fetchWithAuth(`${BASE}/tipos-evento${apenasAtivos ? '?ativo=true' : ''}`);

export const criarTipoEvento = (dados) => fetchWithAuth(`${BASE}/tipos-evento`, { method: 'POST', body: JSON.stringify(dados) });

export const atualizarTipoEvento = (id, dados) => fetchWithAuth(`${BASE}/tipos-evento/${id}`, { method: 'PUT', body: JSON.stringify(dados) });

export const alternarAtivoTipoEvento = (id) => fetchWithAuth(`${BASE}/tipos-evento/${id}/ativo`, { method: 'PATCH' });

// ===== Vínculos Campus × Ministério =====
export const listarMinisteriosPorCampus = (campusId) => fetchWithAuth(`${BASE}/campus/${campusId}/ministerios`);

export const listarCampusPorMinisterio = (ministerioId) => fetchWithAuth(`${BASE}/ministerios/${ministerioId}/campus`);

export const listarVinculosPorCampus = (campusId) => fetchWithAuth(`${BASE}/campus/${campusId}/vinculos`);

export const salvarVinculos = (campusId, ministerioIds) => fetchWithAuth(`${BASE}/campus/${campusId}/vinculos`, {
  method: 'PUT',
  body: JSON.stringify({ ministerioIds }),
});

// ===== Registros de Culto =====
export const listarRegistros = (filtros = {}) => {
  const params = new URLSearchParams();
  appendFiltros(params, filtros);
  return fetchWithAuth(`${BASE}/registros?${params}`);
};

export const buscarRegistro = (id) => fetchWithAuth(`${BASE}/registros/${id}`);

export const criarRegistro = (dados) => fetchWithAuth(`${BASE}/registros`, { method: 'POST', body: JSON.stringify(dados) });

export const atualizarRegistro = (id, dados) => fetchWithAuth(`${BASE}/registros/${id}`, { method: 'PUT', body: JSON.stringify(dados) });

export const deletarRegistro = (id) => fetchWithAuth(`${BASE}/registros/${id}`, { method: 'DELETE' });

export const buscarDashboard = (filtros = {}) => {
  const params = new URLSearchParams();
  appendFiltros(params, filtros);
  return fetchWithAuth(`${BASE}/registros/dashboard?${params}`);
};

export const buscarRelatorioMensal = (filtros = {}) => {
  const params = new URLSearchParams();
  appendFiltros(params, filtros);
  return fetchWithAuth(`${BASE}/registros/relatorio-mensal?${params}`);
};

// ===== Configuração de vínculo Campus × Ministério =====
export const buscarConfiguracaoVinculo = (campusId, ministerioId) => fetchWithAuth(`${BASE}/campus/${campusId}/ministerios/${ministerioId}/config`);

export const atualizarConfiguracaoVinculo = (campusId, ministerioId, dados) => fetchWithAuth(`${BASE}/campus/${campusId}/ministerios/${ministerioId}/config`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

// ===== Validação de Cultos =====
export const verificarValidacao = (filtros = {}) => {
  const params = new URLSearchParams();
  appendFiltros(params, filtros);
  return fetchWithAuth(`${BASE}/validacao?${params}`);
};

export const notificarMinisterio = (dados) => fetchWithAuth(`${BASE}/validacao/notificar`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const notificarTodosMinisterios = (dados) => fetchWithAuth(`${BASE}/validacao/notificar-todos`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const justificarAusencia = (dados) => fetchWithAuth(`${BASE}/validacao/justificar`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const removerJustificativa = (dados) => fetchWithAuth(`${BASE}/validacao/justificar`, {
  method: 'DELETE',
  body: JSON.stringify(dados),
});
