import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005';

// Configurar interceptor para adicionar token JWT
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ========== AGENDAMENTOS ==========

export const criarAgendamento = async (dados) => {
  const response = await axios.post(
    `${API_URL}/api/admin/checkin/schedules`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const listarAgendamentos = async (eventId) => {
  const response = await axios.get(
    `${API_URL}/api/admin/checkin/events/${eventId}/schedules`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const atualizarAgendamento = async (id, dados) => {
  const response = await axios.put(
    `${API_URL}/api/admin/checkin/schedules/${id}`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const deletarAgendamento = async (id) => {
  const response = await axios.delete(
    `${API_URL}/api/admin/checkin/schedules/${id}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ========== ESTAÇÕES ==========

export const criarEstacao = async (dados) => {
  const response = await axios.post(
    `${API_URL}/api/admin/checkin/stations`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const listarEstacoes = async (eventId) => {
  const response = await axios.get(
    `${API_URL}/api/admin/checkin/events/${eventId}/stations`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const atualizarEstacao = async (id, dados) => {
  const response = await axios.put(
    `${API_URL}/api/admin/checkin/stations/${id}`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const deletarEstacao = async (id) => {
  const response = await axios.delete(
    `${API_URL}/api/admin/checkin/stations/${id}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ========== CHECK-INS ==========

export const realizarCheckInManual = async (dados) => {
  const response = await axios.post(
    `${API_URL}/api/admin/checkin/manual`,
    dados,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const listarCheckIns = async (eventId, filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.scheduleId) params.append('scheduleId', filtros.scheduleId);
  if (filtros.stationId) params.append('stationId', filtros.stationId);
  if (filtros.checkInMethod) params.append('checkInMethod', filtros.checkInMethod);
  if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.append('dataFim', filtros.dataFim);

  const response = await axios.get(
    `${API_URL}/api/admin/checkin/events/${eventId}/list?${params.toString()}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const obterEstatisticasCheckIn = async (eventId) => {
  const response = await axios.get(
    `${API_URL}/api/admin/checkin/events/${eventId}/stats`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const validarCodigo = async (orderCode) => {
  const response = await axios.get(
    `${API_URL}/api/public/checkin/validate/${orderCode}`
  );
  return response.data;
};

// ========== CHECK-IN PÚBLICO (QR CODE / NFC) ==========

export const realizarCheckInQRCode = async (dados) => {
  const response = await axios.post(
    `${API_URL}/api/public/checkin/qrcode`,
    dados
  );
  return response.data;
};

export const realizarCheckInNFC = async (dados) => {
  const response = await axios.post(
    `${API_URL}/api/public/checkin/nfc`,
    dados
  );
  return response.data;
};
