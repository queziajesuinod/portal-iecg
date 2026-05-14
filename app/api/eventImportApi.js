const BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

function headers() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

export const getImportSetup = (eventId) => {
  if (!eventId) return Promise.reject(new Error('eventId ausente'));
  return request('GET', `/api/admin/event-import/${eventId}/setup`);
};
export const previewImport = (eventId, body) => request('POST', `/api/admin/event-import/${eventId}/preview`, body);
export const executeImport = (eventId, body) => request('POST', `/api/admin/event-import/${eventId}/execute`, body);

export const listarEventos = (params = {}) => {
  const qs = new URLSearchParams({ includeFinished: 'true', ...params }).toString();
  return request('GET', `/api/admin/events?${qs}`);
};
