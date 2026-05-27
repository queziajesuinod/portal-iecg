const { google } = require('googleapis');
const youtubeOAuth = require('./youtubeOAuthService');

const TIMESTAMP_LINE_REGEX = /^\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}/;
const CUE_INDEX_REGEX = /^\d+$/;
const VTT_HEADER_REGEX = /^WEBVTT/;

function parseCaptionToPlainText(raw, format) {
  if (!raw) return '';
  const text = String(raw).replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const out = [];

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (VTT_HEADER_REGEX.test(line)) continue;
    if (line.startsWith('NOTE')) continue;
    if (TIMESTAMP_LINE_REGEX.test(line)) continue;
    if (CUE_INDEX_REGEX.test(line) && format !== 'vtt') continue;
    if (line.startsWith('STYLE') || line.startsWith('REGION')) continue;
    const clean = line.replace(/<[^>]+>/g, '').trim();
    if (clean) out.push(clean);
  }

  return dedupeConsecutive(out).join('\n');
}

function dedupeConsecutive(lines) {
  const result = [];
  let prev = null;
  for (const line of lines) {
    if (line !== prev) {
      result.push(line);
      prev = line;
    }
  }
  return result;
}

async function getCaptionTracks(channel, videoId) {
  const auth = youtubeOAuth.getAuthorizedClient(channel);
  const youtube = google.youtube({ version: 'v3', auth });
  const { data } = await youtube.captions.list({
    part: ['snippet'],
    videoId,
  });
  return data.items || [];
}

function pickBestManualTrack(tracks, preferredLanguage = 'pt') {
  const manualTracks = tracks.filter((t) => t.snippet?.trackKind === 'standard');
  if (!manualTracks.length) return null;

  const exactLang = manualTracks.find((t) => (t.snippet?.language || '').toLowerCase().startsWith(preferredLanguage.toLowerCase()));
  if (exactLang) return exactLang;

  const draft = manualTracks.find((t) => !t.snippet?.isDraft);
  return draft || manualTracks[0];
}

async function downloadCaption(channel, captionId, format = 'srt') {
  const auth = youtubeOAuth.getAuthorizedClient(channel);
  const youtube = google.youtube({ version: 'v3', auth });
  const res = await youtube.captions.download(
    { id: captionId, tfmt: format },
    { responseType: 'arraybuffer' }
  );

  const buffer = Buffer.from(res.data);
  return buffer.toString('utf8');
}

async function downloadManualCaptionAsText(channel, videoId, { preferredLanguage = 'pt' } = {}) {
  const tracks = await getCaptionTracks(channel, videoId);
  const track = pickBestManualTrack(tracks, preferredLanguage);
  if (!track) return null;

  const raw = await downloadCaption(channel, track.id, 'srt');
  const plain = parseCaptionToPlainText(raw, 'srt');

  return {
    text: plain,
    language: track.snippet?.language || null,
    source: 'caption_manual',
    captionId: track.id,
  };
}

module.exports = {
  parseCaptionToPlainText,
  pickBestManualTrack,
  getCaptionTracks,
  downloadManualCaptionAsText,
};
