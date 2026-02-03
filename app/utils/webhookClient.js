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

export const fetchEventDefinitions = async () => {
  const res = await fetch(`${API_URL}/webhooks/event-definitions`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    }
  });
  if (!res.ok) throw new Error('Falha ao carregar eventos para os webhooks');
  return res.json();
};

export const createEventDefinition = async (definition) => {
  const res = await fetch(`${API_URL}/webhooks/event-definitions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(definition)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'Não foi possível criar o evento');
  }
  return res.json();
};

export const sendWebhookEvent = async (event, payload, options = {}) => {
  try {
    const res = await fetch(`${API_URL}/webhooks/events`, {
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

    if (!res.ok) {
      const err = new Error('Falha ao enviar evento de webhook');
      if (options.throwOnError) {
        throw err;
      }
      console.warn('Falha ao disparar webhook', err);
      return { success: false };
    }

    const data = await res.json().catch(() => null);
    return { success: true, data };
  } catch (err) {
    console.warn('Falha ao disparar webhook', err);
    if (options.throwOnError) {
      throw err;
    }
    return { success: false };
  }
};

export const updateWebhook = async (id, payload) => {
  const res = await fetch(`${API_URL}/webhooks/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.erro || 'Falha ao atualizar o webhook');
  }
  return res.json();
};

export default {
  fetchWebhooks,
  createWebhook,
  toggleWebhook,
  sendWebhookEvent,
  updateWebhook,
  fetchEventDefinitions,
  createEventDefinition
};
