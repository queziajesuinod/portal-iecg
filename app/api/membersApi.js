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

export const registrarAtividadeMembro = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/members/${id}/activities`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const excluirAtividadeMembro = (id, activityId) => fetchWithAuth(`${API_URL}/api/admin/members/${id}/activities/${activityId}`, {
  method: 'DELETE',
});

export const registrarMarcoMembro = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/members/${id}/milestones`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const atualizarJornadaMembro = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/members/${id}/journey`, {
  method: 'PATCH',
  body: JSON.stringify(dados),
});

export const listarTiposAtividadeMembro = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchWithAuth(`${API_URL}/api/admin/members/activity-types${query ? `?${query}` : ''}`);
};

export const criarTipoAtividadeMembro = (dados) => fetchWithAuth(`${API_URL}/api/admin/members/activity-types`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const atualizarTipoAtividadeMembro = (typeId, dados) => fetchWithAuth(`${API_URL}/api/admin/members/activity-types/${typeId}`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

export const atualizarStatusTipoAtividadeMembro = (typeId, isActive) => fetchWithAuth(`${API_URL}/api/admin/members/activity-types/${typeId}/active`, {
  method: 'PATCH',
  body: JSON.stringify({ isActive }),
});
