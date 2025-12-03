// Utilitário centralizado para gerenciar webhooks via API
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

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchWebhooks = async () => {
  const res = await fetch(`${API_URL}/webhooks`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    }
  });
  if (!res.ok) throw new Error('Falha ao carregar webhooks');
  return res.json();
};

export const createWebhook = async (webhook) => {
  const res = await fetch(`${API_URL}/webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(webhook)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.erro || 'Não foi possível criar o webhook');
  }
  return res.json();
};

export const toggleWebhook = async (id, active) => {
  const res = await fetch(`${API_URL}/webhooks/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ active })
  });
  if (!res.ok) throw new Error('Falha ao atualizar o webhook');
  return res.json();
};

export const sendWebhookEvent = async (event, payload) => {
  try {
    await fetch(`${API_URL}/webhooks/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        event,
        payload,
        source: 'portal-iecg'
      })
    });
  } catch (err) {
    console.warn('Falha ao disparar webhook', err);
  }
};

export default {
  fetchWebhooks,
  createWebhook,
  toggleWebhook,
  sendWebhookEvent
};
