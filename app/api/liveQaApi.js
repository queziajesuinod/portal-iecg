import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ADMIN = `${API_URL}/api/admin/qa`;

// ========== SALAS ==========

export const listarSalas = async () => {
  const { data } = await axios.get(`${ADMIN}/sessions`, { headers: getAuthHeader() });
  return data;
};

export const criarSala = async (dados) => {
  const { data } = await axios.post(`${ADMIN}/sessions`, dados, { headers: getAuthHeader() });
  return data;
};

export const atualizarSala = async (id, dados) => {
  const { data } = await axios.put(`${ADMIN}/sessions/${id}`, dados, { headers: getAuthHeader() });
  return data;
};

export const excluirSala = async (id) => {
  await axios.delete(`${ADMIN}/sessions/${id}`, { headers: getAuthHeader() });
  return true;
};

// ========== PERGUNTAS ==========

export const listarPerguntas = async (sessionId) => {
  const { data } = await axios.get(`${ADMIN}/sessions/${sessionId}/questions`, { headers: getAuthHeader() });
  return data;
};

export const moderarPergunta = async (questionId, dados) => {
  const { data } = await axios.patch(`${ADMIN}/questions/${questionId}`, dados, { headers: getAuthHeader() });
  return data;
};

export const excluirPergunta = async (questionId) => {
  await axios.delete(`${ADMIN}/questions/${questionId}`, { headers: getAuthHeader() });
  return true;
};

// ========== UPLOAD DE IMAGEM DE FUNDO (tela ao vivo) ==========

export const uploadBackground = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axios.post(`${ADMIN}/upload-bg`, formData, {
    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' },
  });
  // Retorna URL absoluta para funcionar mesmo se o front estiver em outra origem
  return data.url.startsWith('http') ? data.url : `${API_URL}${data.url}`;
};
