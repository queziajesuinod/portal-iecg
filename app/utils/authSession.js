import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

export const getStoredToken = () => localStorage.getItem('token');

export const isTokenValid = (token) => {
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    return Boolean(decoded.exp && decoded.exp > now);
  } catch (err) {
    return false;
  }
};

export const isStoredTokenValid = () => isTokenValid(getStoredToken());

export const handleUnauthorized = () => {
  localStorage.clear();
  window.location.href = '/login';
};

export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    handleUnauthorized();
    return;
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.erro || error.message || `Erro ${response.status}`);
  }
  if (response.status === 204 || response.status === 205) return null;
  return response.json();
};

// Interceptor global para redirecionar ao login em qualquer resposta 401
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);
