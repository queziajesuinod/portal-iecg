import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

// ============= EVENTOS =============

export const listarEventos = () => api.get('/api/admin/events');

export const buscarEvento = (id) => api.get(`/api/admin/events/${id}`);

export const criarEvento = (dados) => api.post('/api/admin/events', dados);

export const atualizarEvento = (id, dados) => api.put(`/api/admin/events/${id}`, dados);

export const deletarEvento = (id) => api.delete(`/api/admin/events/${id}`);

// ============= LOTES =============

export const listarLotesPorEvento = (eventId) =>
  api.get(`/api/admin/events/${eventId}/batches`);

export const buscarLote = (id) => api.get(`/api/admin/events/batches/${id}`);

export const criarLote = (dados) => api.post('/api/admin/events/batches', dados);

export const atualizarLote = (id, dados) =>
  api.put(`/api/admin/events/batches/${id}`, dados);

export const deletarLote = (id) => api.delete(`/api/admin/events/batches/${id}`);

// ============= CUPONS =============

export const listarCupons = () => api.get('/api/admin/events/coupons');

export const buscarCupom = (id) => api.get(`/api/admin/events/coupons/${id}`);

export const criarCupom = (dados) => api.post('/api/admin/events/coupons', dados);

export const atualizarCupom = (id, dados) =>
  api.put(`/api/admin/events/coupons/${id}`, dados);

export const deletarCupom = (id) => api.delete(`/api/admin/events/coupons/${id}`);

// ============= FORMULÁRIOS =============

export const listarCamposPorEvento = (eventId) =>
  api.get(`/api/admin/events/${eventId}/form-fields`);

export const criarCampo = (dados) => api.post('/api/admin/events/form-fields', dados);

export const criarCamposEmLote = (dados) =>
  api.post('/api/admin/events/form-fields/batch', dados);

export const atualizarCampo = (id, dados) =>
  api.put(`/api/admin/events/form-fields/${id}`, dados);

export const deletarCampo = (id) =>
  api.delete(`/api/admin/events/form-fields/${id}`);

// ============= INSCRIÇÕES =============

export const listarInscricoes = () => api.get('/api/admin/events/registrations');

export const listarInscricoesPorEvento = (eventId) =>
  api.get(`/api/admin/events/${eventId}/registrations`);

export const buscarInscricao = (id) =>
  api.get(`/api/admin/events/registrations/${id}`);

export const cancelarInscricao = (id) =>
  api.post(`/api/admin/events/registrations/${id}/cancel`);

export default api;
