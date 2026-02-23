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

  if (response.status === 204 || response.status === 205) {
    return null;
  }
  return response.json();
};

// ===== EVENTOS =====

export const listarEventos = () => fetchWithAuth(`${API_URL}/api/admin/events`);

export const listarEstatisticas = () => fetchWithAuth(`${API_URL}/api/admin/events/stats`);
export const listarResumoIngressosEvento = (eventId) => fetchWithAuth(`${API_URL}/api/admin/events/${eventId}/tickets-summary`);

export const buscarEvento = (id) => fetchWithAuth(`${API_URL}/api/admin/events/${id}`);

export const criarEvento = (dados) => fetchWithAuth(`${API_URL}/api/admin/events`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const atualizarEvento = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/events/${id}`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

export const deletarEvento = (id) => fetchWithAuth(`${API_URL}/api/admin/events/${id}`, {
  method: 'DELETE',
});

export const duplicarEvento = (id) => fetchWithAuth(`${API_URL}/api/admin/events/${id}/duplicate`, {
  method: 'POST',
});

// ===== LOTES =====

export const listarLotesPorEvento = (eventId) => fetchWithAuth(`${API_URL}/api/admin/events/${eventId}/batches`);

export const criarLote = (dados) => fetchWithAuth(`${API_URL}/api/admin/events/batches`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const atualizarLote = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/events/batches/${id}`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

export const deletarLote = (id) => fetchWithAuth(`${API_URL}/api/admin/events/batches/${id}`, {
  method: 'DELETE',
});

// ===== CUPONS =====

export const listarCupons = () => fetchWithAuth(`${API_URL}/api/admin/events/coupons`);

export const criarCupom = (dados) => fetchWithAuth(`${API_URL}/api/admin/events/coupons`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const atualizarCupom = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/events/coupons/${id}`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

export const deletarCupom = (id) => fetchWithAuth(`${API_URL}/api/admin/events/coupons/${id}`, {
  method: 'DELETE',
});

// ===== CAMPOS DE FORMULÁRIO =====

export const listarCamposPorEvento = (eventId) => fetchWithAuth(`${API_URL}/api/admin/events/${eventId}/form-fields`);

export const criarCampo = (dados) => fetchWithAuth(`${API_URL}/api/admin/events/form-fields`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const criarCamposEmLote = (dados) => fetchWithAuth(`${API_URL}/api/admin/events/form-fields/batch`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const atualizarCampo = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/events/form-fields/${id}`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

export const deletarCampo = (id) => fetchWithAuth(`${API_URL}/api/admin/events/form-fields/${id}`, {
  method: 'DELETE',
});

// ===== INSCRIÇÕES =====

export const listarInscricoes = () => fetchWithAuth(`${API_URL}/api/admin/events/registrations`);

export const listarInscricoesPorEvento = (eventId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/admin/events/${eventId}/registrations${query ? `?${query}` : ''}`;
  return fetchWithAuth(url);
};
export const listarInscritosConfirmadosPorEvento = (eventId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/admin/events/${eventId}/registration-attendees/confirmed${query ? `?${query}` : ''}`;
  return fetchWithAuth(url);
};

export const buscarInscricao = (id) => fetchWithAuth(`${API_URL}/api/admin/events/registrations/${id}`);

export const cancelarInscricao = (id) => fetchWithAuth(`${API_URL}/api/admin/events/registrations/${id}/cancel`, {
  method: 'POST',
});

export const obterInfoCancelamentoInscricao = (id) => fetchWithAuth(`${API_URL}/api/admin/events/registrations/${id}/cancel-info`);

export const criarPagamentoInscricao = (id, dados) => fetchWithAuth(`${API_URL}/api/public/events/registrations/${id}/payments`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const criarPagamentoOfflineInscricao = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/events/registrations/${id}/payments/offline`, {
  method: 'POST',
  body: JSON.stringify(dados),
});
export const atualizarPagamentoOfflineInscricao = (id, paymentId, dados) => fetchWithAuth(`${API_URL}/api/admin/events/registrations/${id}/payments/${paymentId}/offline`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

export const deletarPagamentoInscricao = (id, paymentId) => fetchWithAuth(`${API_URL}/api/admin/events/registrations/${id}/payments/${paymentId}`, {
  method: 'DELETE'
});

export const recalcularStatusInscricao = (id) => fetchWithAuth(`${API_URL}/api/admin/events/registrations/${id}/recalculate-status`, {
  method: 'POST'
});

// ===== FORMAS DE PAGAMENTO =====

export const listarFormasPagamento = (eventId) => fetchWithAuth(`${API_URL}/api/admin/events/${eventId}/payment-options`);

export const criarFormaPagamento = (eventId, dados) => fetchWithAuth(`${API_URL}/api/admin/events/${eventId}/payment-options`, {
  method: 'POST',
  body: JSON.stringify(dados),
});

export const atualizarFormaPagamento = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/events/payment-options/${id}`, {
  method: 'PUT',
  body: JSON.stringify(dados),
});

export const deletarFormaPagamento = (id) => fetchWithAuth(`${API_URL}/api/admin/events/payment-options/${id}`, {
  method: 'DELETE',
});
