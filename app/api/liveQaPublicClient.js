import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005';
const PUBLIC = `${API_URL}/api/public/qa`;

// Identificador anônimo persistente do visitante (para curtidas e "minhas perguntas")
export const getVoterToken = () => {
  let token = localStorage.getItem('qaVoterToken');
  if (!token) {
    token = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('qaVoterToken', token);
  }
  return token;
};

export const entrarSala = async (code) => {
  const { data } = await axios.get(`${PUBLIC}/${encodeURIComponent(code)}`);
  return data;
};

export const listarPerguntas = async (code) => {
  const { data } = await axios.get(`${PUBLIC}/${encodeURIComponent(code)}/questions`, {
    params: { voterToken: getVoterToken() },
  });
  return data;
};

export const perguntaAoVivo = async (code) => {
  const { data } = await axios.get(`${PUBLIC}/${encodeURIComponent(code)}/live`);
  return data;
};

export const enviarPergunta = async (code, { text, authorName }) => {
  const { data } = await axios.post(`${PUBLIC}/${encodeURIComponent(code)}/questions`, {
    text,
    authorName,
    authorToken: getVoterToken(),
  });
  return data;
};

export const curtirPergunta = async (questionId) => {
  const { data } = await axios.post(`${PUBLIC}/questions/${questionId}/like`, {
    voterToken: getVoterToken(),
  });
  return data;
};
