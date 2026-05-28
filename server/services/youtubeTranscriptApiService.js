const axios = require('axios');

let cancelled = false;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchTranscript(videoId, { languageHint = 'pt' } = {}) {
  cancelled = false;

  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=${languageHint}`;
  let html;
  try {
    const resp = await axios.get(videoUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': `${languageHint}-BR,${languageHint};q=0.9,en;q=0.8`,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 20000,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    html = resp.data;
  } catch (err) {
    console.warn(`[transcript-api] erro ao baixar pagina do video: ${err.message}`);
    return null;
  }

  console.log(`[transcript-api] pagina baixada (${html?.length || 0} bytes)`);

  if (cancelled) throw new Error('youtube-transcript cancelado');

  if (typeof html === 'string' && html.includes('consent.youtube.com')) {
    console.warn('[transcript-api] YouTube retornou consent wall, transcript indisponivel sem cookies');
    return null;
  }

  const tracks = extractCaptionTracks(html);
  if (!tracks) {
    console.warn('[transcript-api] "captionTracks" nao encontrado no HTML — video pode estar sem legendas ou pagina foi servida em formato diferente');
    return null;
  }
  if (tracks.length === 0) {
    console.warn('[transcript-api] array captionTracks vazio — video sem legendas');
    return null;
  }
  console.log(`[transcript-api] ${tracks.length} track(s) encontrado(s): ${tracks.map((t) => `${t.languageCode}${t.kind === 'asr' ? '(asr)' : ''}`).join(', ')}`);

  const chosen = pickTrack(tracks, languageHint);
  if (!chosen || !chosen.baseUrl) {
    console.warn('[transcript-api] nenhum track tem baseUrl');
    return null;
  }
  console.log(`[transcript-api] track escolhido: lang=${chosen.languageCode} kind=${chosen.kind || 'manual'}`);

  if (cancelled) throw new Error('youtube-transcript cancelado');

  let xml;
  try {
    const resp = await axios.get(chosen.baseUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 20000,
      responseType: 'text',
      transformResponse: [(data) => data],
    });
    xml = String(resp.data || '');
  } catch (err) {
    console.warn(`[transcript-api] erro ao baixar XML das legendas: ${err.message}`);
    return null;
  }

  console.log(`[transcript-api] XML baixado (${xml.length} bytes)`);

  const text = parseTranscriptXml(xml);
  if (!text) {
    console.warn('[transcript-api] XML parseado mas sem texto — formato inesperado');
    return null;
  }

  return {
    text,
    language: chosen.languageCode || languageHint,
    source: chosen.kind === 'asr' ? 'caption_auto' : 'caption_manual',
    video_id: videoId,
  };
}

function extractCaptionTracks(html) {
  if (typeof html !== 'string') return null;
  const marker = '"captionTracks":';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  const start = idx + marker.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  let arrEnd = -1;

  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) { arrEnd = i; break; }
    }
  }

  if (arrEnd === -1) return null;

  const raw = html.slice(start, arrEnd + 1);
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function pickTrack(tracks, lang) {
  const langExact = (t) => t.languageCode === lang;
  const langRegion = (t) => typeof t.languageCode === 'string' && t.languageCode.startsWith(`${lang}-`);
  const isManual = (t) => t.kind !== 'asr';

  return tracks.find((t) => langExact(t) && isManual(t))
    || tracks.find((t) => langRegion(t) && isManual(t))
    || tracks.find((t) => langExact(t))
    || tracks.find((t) => langRegion(t))
    || tracks.find(isManual)
    || tracks[0]
    || null;
}

function parseTranscriptXml(xml) {
  if (typeof xml !== 'string') return '';
  const out = [];
  const re = /<text\b[^>]*>([\s\S]*?)<\/text>/g;
  let m = re.exec(xml);
  while (m !== null) {
    const decoded = decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
    if (decoded) out.push(decoded);
    m = re.exec(xml);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
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
