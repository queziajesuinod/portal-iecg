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

const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `Erro ${response.status}`);
  }

  if (response.status === 204 || response.status === 205) {
    return null;
  }
  return response.json();
};

export const listarMembros = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/admin/members${query ? `?${query}` : ''}`;
  return fetchWithAuth(url);
};

export const buscarMembro = (id) => fetchWithAuth(`${API_URL}/api/admin/members/${id}`);

export const criarMembro = (dados) => fetchWithAuth(`${API_URL}/api/admin/members`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const atualizarMembro = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/members/${id}`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

export const deletarMembro = (id) => fetchWithAuth(`${API_URL}/api/admin/members/${id}`, {
  method: 'DELETE',
});
