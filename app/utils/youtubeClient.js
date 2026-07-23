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

export const startChannelOAuth = async (ownerName, channelId = null) => {
  const res = await fetch(`${BASE}/channels/oauth/start`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ ownerName, channelId }),
  });
  return parseOrThrow(res, 'Falha ao iniciar autorização OAuth');
};

export const fetchChannelVideos = async (channelId, {
  search, limit = 50, offset = 0, includeIgnored = false,
} = {}) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (includeIgnored) params.set('includeIgnored', 'true');
  const res = await fetch(`${BASE}/channels/${channelId}/videos?${params.toString()}`, {
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao carregar vídeos');
};

export const toggleVideoIgnored = async (id, ignored) => {
  const res = await fetch(`${BASE}/videos/${id}/ignored`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ ignored }),
  });
  return parseOrThrow(res, 'Falha ao alternar vídeo ignorado');
};

export const syncChannelVideos = async (channelId, maxPages = 5) => {
  const res = await fetch(`${BASE}/channels/${channelId}/videos/sync`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ maxPages }),
  });
  return parseOrThrow(res, 'Falha ao sincronizar vídeos');
};

export const uploadVideoAudio = async (videoId, file) => {
  const form = new FormData();
  form.append('audio', file);
  const res = await fetch(`${BASE}/videos/${videoId}/audio`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return parseOrThrow(res, 'Falha ao enviar audio');
};

export const transcribeVideoNow = async (videoId) => {
  const res = await fetch(`${BASE}/videos/${videoId}/transcribe`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao transcrever audio anexado');
};

export const queueVideoForHelper = async (videoId) => {
  const res = await fetch(`${BASE}/videos/${videoId}/transcript/queue`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao enfileirar vídeo');
};

export const reactivateFailedTranscript = async (videoId) => {
  const res = await fetch(`${BASE}/videos/${videoId}/transcript/reactivate`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao reativar transcrição');
};

export const deleteVideo = async (videoId) => {
  const res = await fetch(`${BASE}/videos/${videoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseOrThrow(res, 'Falha ao excluir vídeo');
};

export const fetchTranscripts = async ({
  status, channelId, published, speaker, limit = 50, offset = 0
} = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (channelId) params.set('channelId', channelId);
  if (published !== undefined) params.set('published', String(published));
  if (speaker) params.set('speaker', speaker);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  const res = await fetch(`${BASE}/transcripts?${params.toString()}`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao carregar transcricoes');
};

export const fetchTranscriptSpeakers = async (search) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const qs = params.toString();
  const res = await fetch(`${BASE}/transcripts/speakers${qs ? `?${qs}` : ''}`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao carregar oradores');
};

export const fetchTranscriptById = async (id) => {
  const res = await fetch(`${BASE}/transcripts/${id}`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao carregar transcrição');
};

export const fetchTranscriptProgress = async (id) => {
  const res = await fetch(`${BASE}/transcripts/${id}/progress`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao carregar progresso');
};

export const fetchTranscriptProgressBatch = async (ids) => {
  if (!ids || !ids.length) return [];
  const res = await fetch(`${BASE}/transcripts/progress?ids=${encodeURIComponent(ids.join(','))}`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao carregar progresso em lote');
};

export const updateTranscript = async (id, payload) => {
  const res = await fetch(`${BASE}/transcripts/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseOrThrow(res, 'Falha ao atualizar transcrição');
};

export const deleteTranscript = async (id) => {
  const res = await fetch(`${BASE}/transcripts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseOrThrow(res, 'Falha ao remover transcrição');
};

export const cancelTranscript = async (id) => {
  const res = await fetch(`${BASE}/transcripts/${id}/cancel`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao cancelar transcrição');
};

export const regenerateSummary = async (id) => {
  const res = await fetch(`${BASE}/transcripts/${id}/summarize`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao regenerar resumo');
};

// ----- Recortes / Shorts -----

export const requestClips = async (videoId) => {
  const res = await fetch(`${BASE}/videos/${videoId}/clips/request`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseOrThrow(res, 'Falha ao solicitar recortes');
};

export const suggestClips = async (videoId, options = {}) => {
  const res = await fetch(`${BASE}/videos/${videoId}/clips/suggest`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(options),
  });
  return parseOrThrow(res, 'Falha ao sugerir recortes');
};

export const fetchClips = async (videoId) => {
  const res = await fetch(`${BASE}/videos/${videoId}/clips`, { headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao carregar recortes');
};

export const updateClip = async (clipId, payload) => {
  const res = await fetch(`${BASE}/clips/${clipId}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseOrThrow(res, 'Falha ao editar recorte');
};

export const approveClip = async (clipId) => {
  const res = await fetch(`${BASE}/clips/${clipId}/approve`, { method: 'POST', headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao aprovar recorte');
};

export const discardClip = async (clipId) => {
  const res = await fetch(`${BASE}/clips/${clipId}/discard`, { method: 'POST', headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao descartar recorte');
};

export const renderClip = async (clipId) => {
  const res = await fetch(`${BASE}/clips/${clipId}/render`, { method: 'POST', headers: jsonHeaders() });
  return parseOrThrow(res, 'Falha ao renderizar recorte');
};

export const publishClip = async (clipId, options = {}) => {
  const res = await fetch(`${BASE}/clips/${clipId}/publish`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(options),
  });
  return parseOrThrow(res, 'Falha ao publicar recorte');
};

// O arquivo do clip exige Authorization; buscamos como blob e devolvemos um object URL
// (usar em <video src> e revogar com URL.revokeObjectURL quando trocar).
export const fetchClipBlobUrl = async (clipId) => {
  const res = await fetch(`${BASE}/clips/${clipId}/file`, { headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'Falha ao carregar arquivo do recorte');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const downloadClipFile = async (clipId, filename = 'recorte.mp4') => {
  const url = await fetchClipBlobUrl(clipId);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
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
