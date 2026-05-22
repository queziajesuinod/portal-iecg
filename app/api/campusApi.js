import { fetchWithAuth } from 'utils/authSession';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  const { protocol, hostname, port } = window.location;
  if (port === '3005') {
    return `${protocol}//${hostname}:3005`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const API_URL = resolveApiUrl();

/** Lista todos os campi ativos. Endpoint legado em /start/campus. */
// eslint-disable-next-line import/prefer-default-export
export const listarCampus = () => fetchWithAuth(`${API_URL}/start/campus`);
