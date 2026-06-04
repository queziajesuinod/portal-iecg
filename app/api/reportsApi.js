// API helper — Módulo de Relatórios (hub central)
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
const BASE = `${API_URL}/api/admin/reports`;

const buildQuery = (filtros = {}) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v != null && v !== '') params.append(k, v);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const buscarRelatorioMembros = (filtros = {}) => fetchWithAuth(`${BASE}/membros${buildQuery(filtros)}`);

export const buscarRelatorioEventosFinanceiro = (filtros = {}) => fetchWithAuth(`${BASE}/eventos-financeiro${buildQuery(filtros)}`);

export const buscarRelatorioCultos = (filtros = {}) => fetchWithAuth(`${BASE}/cultos${buildQuery(filtros)}`);
