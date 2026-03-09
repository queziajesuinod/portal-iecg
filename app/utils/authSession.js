import { jwtDecode } from 'jwt-decode';

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
