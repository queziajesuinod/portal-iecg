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
const BASE = `${API_URL}/api/admin/voluntariado`;

// ===== Áreas de Voluntariado =====
export const listarAreas = (apenasAtivos = false) =>
  fetchWithAuth(`${BASE}/areas${apenasAtivos ? '?ativo=true' : ''}`);

export const criarArea = (dados) =>
  fetchWithAuth(`${BASE}/areas`, { method: 'POST', body: JSON.stringify(dados) });

export const atualizarArea = (id, dados) =>
  fetchWithAuth(`${BASE}/areas/${id}`, { method: 'PUT', body: JSON.stringify(dados) });

export const alternarAtivoArea = (id) =>
  fetchWithAuth(`${BASE}/areas/${id}/ativo`, { method: 'PATCH' });

// ===== Voluntariados =====
export const listarVoluntariados = (filtros = {}) => {
  const query = new URLSearchParams(filtros).toString();
  return fetchWithAuth(`${BASE}${query ? `?${query}` : ''}`);
};

export const criarVoluntariado = (dados) =>
  fetchWithAuth(BASE, { method: 'POST', body: JSON.stringify(dados) });

export const atualizarVoluntariado = (id, dados) =>
  fetchWithAuth(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(dados) });

export const aprovarVoluntariado = (id) =>
  fetchWithAuth(`${BASE}/${id}/aprovar`, { method: 'PATCH' });

export const encerrarVoluntariado = (id, dataFim) =>
  fetchWithAuth(`${BASE}/${id}/encerrar`, { method: 'PATCH', body: JSON.stringify({ dataFim }) });

export const removerVoluntariado = (id) =>
  fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' });
