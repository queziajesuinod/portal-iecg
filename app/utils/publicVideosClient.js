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
const BASE = `${API_URL}/api/public/videos`;

async function parseOrThrow(res, fallbackMessage) {
  if (res.ok) {
    if (res.status === 204) return null;
    return res.json();
  }
  const data = await res.json().catch(() => ({}));
  throw new Error(data?.message || data?.erro || fallbackMessage);
}

export const fetchPublicVideos = async ({
  channelId, search, limit = 20, offset = 0, all = false
} = {}) => {
  const params = new URLSearchParams();
  if (channelId) params.set('channelId', channelId);
  if (search) params.set('search', search);
  if (all) {
    params.set('all', 'true');
  } else {
    params.set('limit', String(limit));
    params.set('offset', String(offset));
  }
  const res = await fetch(`${BASE}?${params.toString()}`);
  return parseOrThrow(res, 'Falha ao carregar videos');
};

export const fetchPublicVideoDetail = async (videoId) => {
  const res = await fetch(`${BASE}/${encodeURIComponent(videoId)}`);
  return parseOrThrow(res, 'Falha ao carregar video');
};

export const fetchPublicChannels = async () => {
  const res = await fetch(`${BASE}/channels`);
  return parseOrThrow(res, 'Falha ao carregar canais');
};
