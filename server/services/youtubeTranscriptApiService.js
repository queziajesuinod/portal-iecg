const { YoutubeTranscript } = require('youtube-transcript');

let cancelled = false;

async function fetchTranscript(videoId, { languageHint = 'pt' } = {}) {
  cancelled = false;

  const attempts = [
    { lang: languageHint },
    { lang: `${languageHint}-BR` },
    {},
  ];

  let lastError = null;
  for (const opts of attempts) {
    if (cancelled) {
      throw new Error('youtube-transcript cancelado');
    }
    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId, opts);
      if (cancelled) {
        throw new Error('youtube-transcript cancelado');
      }
      if (!Array.isArray(segments) || segments.length === 0) {
        continue;
      }
      const text = segments
        .map((s) => decodeEntities(String(s.text || '')).trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) continue;

      return {
        text,
        language: segments[0]?.lang || opts.lang || languageHint,
        source: 'caption_auto',
        video_id: videoId,
      };
    } catch (err) {
      lastError = err;
      const msg = (err && err.message) || '';
      if (
        /Transcript is disabled/i.test(msg)
        || /No transcripts/i.test(msg)
        || /TranscriptsDisabled/i.test(msg)
      ) {
        return null;
      }
    }
  }

  if (lastError) {
    console.warn(`[transcript-api] todas as tentativas falharam: ${lastError.message}`);
  }
  return null;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function killActive() {
  if (cancelled) return false;
  cancelled = true;
  return true;
}

module.exports = {
  fetchTranscript,
  killActive,
};
