import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ADMIN = `${API_URL}/api/admin/bible`;

export const listarVersoes = async () => {
  const { data } = await axios.get(`${ADMIN}/versions`, { headers: getAuthHeader() });
  return data;
};

export const buscarVersiculos = async ({
  query, version, limit, contextText, excludeTopics
}) => {
  const { data } = await axios.post(
    `${ADMIN}/search`,
    {
      query, version, limit, contextText, excludeTopics
    },
    { headers: getAuthHeader() }
  );
  return data;
};
