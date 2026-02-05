import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005';

// Configurar interceptor para adicionar token JWT
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ========== GRUPOS ==========

export const criarGrupo = async (dados) => {
  const response = await axios.post(
    `${API_URL}/api/admin/notifications/groups`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const listarGrupos = async (eventId) => {
  const response = await axios.get(
    `${API_URL}/api/admin/notifications/events/${eventId}/groups`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const adicionarMembrosAoGrupo = async (groupId, registrationIds) => {
  const response = await axios.post(
    `${API_URL}/api/admin/notifications/groups/${groupId}/members`,
    { registrationIds },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const removerMembroDoGrupo = async (groupId, registrationId) => {
  const response = await axios.delete(
    `${API_URL}/api/admin/notifications/groups/${groupId}/members/${registrationId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const criarGrupoPorAgendamento = async (scheduleId) => {
  const response = await axios.post(
    `${API_URL}/api/admin/notifications/groups/from-schedule`,
    { scheduleId },
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ========== TEMPLATES ==========

export const criarTemplate = async (dados) => {
  const response = await axios.post(
    `${API_URL}/api/admin/notifications/templates`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const listarTemplates = async (eventId = null) => {
  const params = eventId ? `?eventId=${eventId}` : '';
  const response = await axios.get(
    `${API_URL}/api/admin/notifications/templates${params}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const atualizarTemplate = async (id, dados) => {
  const response = await axios.put(
    `${API_URL}/api/admin/notifications/templates/${id}`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const deletarTemplate = async (id) => {
  const response = await axios.delete(
    `${API_URL}/api/admin/notifications/templates/${id}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ========== NOTIFICAÇÕES ==========

export const enviarNotificacao = async (dados) => {
  const response = await axios.post(
    `${API_URL}/api/admin/notifications/send`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const enviarNotificacaoParaGrupo = async (groupId, dados) => {
  const response = await axios.post(
    `${API_URL}/api/admin/notifications/groups/${groupId}/send`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const listarNotificacoes = async (eventId, filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.status) params.append('status', filtros.status);
  if (filtros.channel) params.append('channel', filtros.channel);
  if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
  if (filtros.limit) params.append('limit', filtros.limit);

  const response = await axios.get(
    `${API_URL}/api/admin/notifications/events/${eventId}/list?${params.toString()}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const obterEstatisticasNotificacoes = async (eventId) => {
  const response = await axios.get(
    `${API_URL}/api/admin/notifications/events/${eventId}/stats`,
    { headers: getAuthHeader() }
  );
  return response.data;
};
