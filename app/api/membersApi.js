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

export const listarMembros = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/admin/members${query ? `?${query}` : ''}`;
  return fetchWithAuth(url);
};

export const listarMembrosDuplicados = () => fetchWithAuth(`${API_URL}/api/admin/members/duplicates`);

export const fundirMembrosDuplicados = (memberIdA, memberIdB) => fetchWithAuth(`${API_URL}/api/admin/members/duplicates/merge`, {
  method: 'POST',
  body: JSON.stringify({ memberIdA, memberIdB }),
});

export const desconsiderarMembrosDuplicados = (memberIdA, memberIdB) => fetchWithAuth(`${API_URL}/api/admin/members/duplicates/dismiss`, {
  method: 'POST',
  body: JSON.stringify({ memberIdA, memberIdB }),
});

export const buscarMembro = (id) => fetchWithAuth(`${API_URL}/api/admin/members/${id}`);

export const buscarMeuMembro = () => fetchWithAuth(`${API_URL}/api/admin/members/me`);

export const listarPossiveisConjugesMeuMembro = () => fetchWithAuth(`${API_URL}/api/admin/members/me/spouse-candidates`);

export const criarMembro = (dados) => fetchWithAuth(`${API_URL}/api/admin/members`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const atualizarMembro = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/members/${id}`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

export const atualizarMeuPerfilMembro = (dados) => fetchWithAuth(`${API_URL}/api/admin/members/me/profile`, {
  method: 'PATCH',
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
