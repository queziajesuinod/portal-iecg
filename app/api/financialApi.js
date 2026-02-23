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
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
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

export const listarRegistrosFinanceiros = (params = {}) => {
  const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
  const query = new URLSearchParams(filteredParams).toString();
  const url = `${API_URL}/api/admin/financial/records${query ? `?${query}` : ''}`;
  return fetchWithAuth(url);
};

export const buscarConfiguracaoTaxasFinanceiras = () => fetchWithAuth(`${API_URL}/api/admin/financial/fee-config`);

export const atualizarConfiguracaoTaxasFinanceiras = (dados) => fetchWithAuth(`${API_URL}/api/admin/financial/fee-config`, {
  method: 'PUT',
  body: JSON.stringify(dados)
});

export const criarSaidaFinanceira = (dados) => fetchWithAuth(`${API_URL}/api/admin/financial/expenses`, {
  method: 'POST',
  body: JSON.stringify(dados)
});

export const atualizarSaidaFinanceira = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/financial/expenses/${id}`, {
  method: 'PUT',
  body: JSON.stringify(dados)
});

export const deletarSaidaFinanceira = (id) => fetchWithAuth(`${API_URL}/api/admin/financial/expenses/${id}`, {
  method: 'DELETE'
});
