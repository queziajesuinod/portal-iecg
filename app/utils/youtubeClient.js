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
const BASE = `${API_URL}/api/admin/youtube`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...authHeaders(),
});

async function parseOrThrow(res, fallbackMessage) {
  if (res.ok) {
    if (res.status === 204) return null;
    return res.json();
  }
  const data = await res.json().catch(() => ({}));
  throw new Error(data?.message || data?.erro || fallbackMessage);
}

export const fetchChannels = async () => {
  const res = await fetch(`${BASE}/channels`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao carregar canais');
};

export const updateChannel = async (id, payload) => {
  const res = await fetch(`${BASE}/channels/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseOrThrow(res, 'Falha ao atualizar canal');
};

export const deleteChannel = async (id) => {
  const res = await fetch(`${BASE}/channels/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseOrThrow(res, 'Falha ao remover canal');
};

export const startChannelOAuth = async (ownerName) => {
  const res = await fetch(`${BASE}/channels/oauth/start`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ ownerName }),
  });
  return parseOrThrow(res, 'Falha ao iniciar autorizacao OAuth');
};

export const fetchChannelVideos = async (channelId, { search, limit = 50, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  const res = await fetch(`${BASE}/channels/${channelId}/videos?${params.toString()}`, {
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao carregar videos');
};

export const syncChannelVideos = async (channelId, maxPages = 5) => {
  const res = await fetch(`${BASE}/channels/${channelId}/videos/sync`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ maxPages }),
  });
  return parseOrThrow(res, 'Falha ao sincronizar videos');
};

export const refreshVideoCaptions = async (videoId) => {
  const res = await fetch(`${BASE}/videos/${videoId}/captions/refresh`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao verificar legendas');
};

export const enqueueTranscripts = async (videoIds) => {
  const res = await fetch(`${BASE}/transcripts/enqueue`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ videoIds }),
  });
  return parseOrThrow(res, 'Falha ao enfileirar videos');
};

export const transcribeVideoNow = async (videoId) => {
  const res = await fetch(`${BASE}/videos/${videoId}/transcribe`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao transcrever video');
};

export const fetchTranscripts = async ({
  status, channelId, published, limit = 50, offset = 0
} = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (channelId) params.set('channelId', channelId);
  if (published !== undefined) params.set('published', String(published));
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  const res = await fetch(`${BASE}/transcripts?${params.toString()}`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao carregar transcricoes');
};

export const fetchTranscriptById = async (id) => {
  const res = await fetch(`${BASE}/transcripts/${id}`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao carregar transcricao');
};

export const updateTranscript = async (id, payload) => {
  const res = await fetch(`${BASE}/transcripts/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseOrThrow(res, 'Falha ao atualizar transcricao');
};

export const deleteTranscript = async (id) => {
  const res = await fetch(`${BASE}/transcripts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseOrThrow(res, 'Falha ao remover transcricao');
};

export const cancelTranscript = async (id) => {
  const res = await fetch(`${BASE}/transcripts/${id}/cancel`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao cancelar transcricao');
};

export const regenerateSummary = async (id) => {
  const res = await fetch(`${BASE}/transcripts/${id}/summarize`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao regenerar resumo');
};

export const fetchWorkerStatus = async () => {
  const res = await fetch(`${BASE}/worker/status`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao consultar worker');
};

export const runWorkerOnce = async () => {
  const res = await fetch(`${BASE}/worker/run-once`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao rodar worker');
};
