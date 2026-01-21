// API helper para eventos - usa fetch seguindo o padrão do sistema

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

// Helper para fazer requisições autenticadas
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

  return response.json();
};

// ===== EVENTOS =====

export const listarEventos = () => {
  return fetchWithAuth(`${API_URL}/api/admin/events`);
};

export const buscarEvento = (id) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/${id}`);
};

export const criarEvento = (dados) => {
  return fetchWithAuth(`${API_URL}/api/admin/events`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
};

export const atualizarEvento = (id, dados) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
};

export const deletarEvento = (id) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/${id}`, {
    method: 'DELETE',
  });
};

// ===== LOTES =====

export const listarLotesPorEvento = (eventId) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/${eventId}/batches`);
};

export const criarLote = (dados) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/batches`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
};

export const atualizarLote = (id, dados) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/batches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
};

export const deletarLote = (id) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/batches/${id}`, {
    method: 'DELETE',
  });
};

// ===== CUPONS =====

export const listarCupons = () => {
  return fetchWithAuth(`${API_URL}/api/admin/events/coupons`);
};

export const criarCupom = (dados) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/coupons`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
};

export const atualizarCupom = (id, dados) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
};

export const deletarCupom = (id) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/coupons/${id}`, {
    method: 'DELETE',
  });
};

// ===== CAMPOS DE FORMULÁRIO =====

export const listarCamposPorEvento = (eventId) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/${eventId}/form-fields`);
};

export const criarCampo = (dados) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/form-fields`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
};

export const criarCamposEmLote = (dados) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/form-fields/batch`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
};

export const atualizarCampo = (id, dados) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/form-fields/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
};

export const deletarCampo = (id) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/form-fields/${id}`, {
    method: 'DELETE',
  });
};

// ===== INSCRIÇÕES =====

export const listarInscricoes = () => {
  return fetchWithAuth(`${API_URL}/api/admin/events/registrations`);
};

export const listarInscricoesPorEvento = (eventId) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/${eventId}/registrations`);
};

export const buscarInscricao = (id) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/registrations/${id}`);
};

export const cancelarInscricao = (id) => {
  return fetchWithAuth(`${API_URL}/api/admin/events/registrations/${id}/cancel`, {
    method: 'POST',
  });
};
