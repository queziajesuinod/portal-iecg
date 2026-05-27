const { google } = require('googleapis');
const youtubeOAuth = require('./youtubeOAuthService');

function parseIsoDuration(iso) {
  if (!iso) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

async function getYoutubeClient(channel) {
  const auth = youtubeOAuth.getAuthorizedClient(channel);
  return google.youtube({ version: 'v3', auth });
}

async function listPlaylistItems(youtube, playlistId, { maxPages = 5 } = {}) {
  const items = [];
  let pageToken;
  let pages = 0;

  do {
    const { data } = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId,
      maxResults: 50,
      pageToken,
    });
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
    pages += 1;
  } while (pageToken && pages < maxPages);

  return items;
}

async function fetchVideoDetails(youtube, videoIds) {
  if (!videoIds.length) return [];
  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const all = [];
  for (const chunk of chunks) {
    const { data } = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'status'],
      id: chunk,
      maxResults: 50,
    });
    all.push(...(data.items || []));
  }
  return all;
}

function getSyncFilters() {
  const minDuration = Number(process.env.SYNC_MIN_DURATION_SECONDS);
  return {
    minDurationSeconds: Number.isFinite(minDuration) && minDuration >= 0 ? minDuration : 900,
    onlyPublic: process.env.SYNC_ONLY_PUBLIC !== 'false',
  };
}

async function syncChannelVideos(channel, { maxPages = 5, filters: overrides = {} } = {}) {
  if (!channel.uploadsPlaylistId) {
    throw new Error('Canal não tem uploadsPlaylistId. Reconecte via OAuth.');
  }

  const filters = { ...getSyncFilters(), ...overrides };

  const youtube = await getYoutubeClient(channel);
  const playlistItems = await listPlaylistItems(youtube, channel.uploadsPlaylistId, { maxPages });

  const videoIds = playlistItems
    .map((it) => it.contentDetails?.videoId)
    .filter(Boolean);

  const details = await fetchVideoDetails(youtube, videoIds);
  const byId = new Map(details.map((v) => [v.id, v]));

  const now = new Date();
  let skippedByPrivacy = 0;
  let skippedByDuration = 0;

  const items = videoIds.map((videoId) => {
    const v = byId.get(videoId);
    if (!v) return null;

    const privacy = v.status?.privacyStatus;
    const durationSeconds = parseIsoDuration(v.contentDetails?.duration);

    let ignored = false;
    let ignoreReason = null;

    if (filters.onlyPublic && privacy !== 'public') {
      ignored = true;
      ignoreReason = 'not_public';
      skippedByPrivacy += 1;
    } else if (filters.minDurationSeconds > 0 && (!durationSeconds || durationSeconds < filters.minDurationSeconds)) {
      ignored = true;
      ignoreReason = 'too_short';
      skippedByDuration += 1;
    }

    const thumbs = v.snippet?.thumbnails || {};
    return {
      videoId,
      title: v.snippet?.title || '(sem titulo)',
      description: v.snippet?.description || null,
      publishedAt: v.snippet?.publishedAt ? new Date(v.snippet.publishedAt) : null,
      thumbnailUrl: thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || null,
      durationSeconds,
      hasCaption: v.contentDetails?.caption === 'true',
      lastSyncedAt: now,
      ignored,
      ignoreReason,
    };
  }).filter(Boolean);

  return {
    items, skippedByPrivacy, skippedByDuration, filters
  };
}

async function fetchCaptionInfo(channel, videoId) {
  const youtube = await getYoutubeClient(channel);
  const { data } = await youtube.captions.list({
    part: ['snippet'],
    videoId,
  });

  const tracks = data.items || [];
  let hasManual = false;
  let hasAuto = false;
  const languages = [];

  for (const track of tracks) {
    const kind = track.snippet?.trackKind;
    const lang = track.snippet?.language;
    if (kind === 'standard') hasManual = true;
    if (kind === 'asr') hasAuto = true;
    if (lang) languages.push({ language: lang, trackKind: kind });
  }

  return {
    hasManualCaption: hasManual,
    hasAutoCaption: hasAuto,
    captionLanguages: languages,
    captionCheckedAt: new Date(),
  };
}

module.exports = {
  syncChannelVideos,
  fetchCaptionInfo,
  parseIsoDuration,
};
