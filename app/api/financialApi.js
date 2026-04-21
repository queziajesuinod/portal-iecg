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

export const exportarSaidasFinanceiras = (params = {}) => {
  const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') return acc;
    acc[key] = value;
    return acc;
  }, {});
  const query = new URLSearchParams(filteredParams).toString();
  return fetchWithAuth(`${API_URL}/api/admin/financial/expenses/export${query ? `?${query}` : ''}`);
};

export const criarEntradaManual = (dados) => fetchWithAuth(`${API_URL}/api/admin/financial/manual-entries`, {
  method: 'POST',
  body: JSON.stringify(dados)
});

export const atualizarEntradaManual = (id, dados) => fetchWithAuth(`${API_URL}/api/admin/financial/manual-entries/${id}`, {
  method: 'PUT',
  body: JSON.stringify(dados)
});

export const deletarEntradaManual = (id) => fetchWithAuth(`${API_URL}/api/admin/financial/manual-entries/${id}`, {
  method: 'DELETE'
});
