const axios = require('axios');

let cancelled = false;

const USER_AGENT_WEB = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const USER_AGENT_TV = 'Mozilla/5.0 (PlayStation; PlayStation 4/12.00) '
  + 'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15';
const USER_AGENT_IOS = 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X;)';

const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';

const INNERTUBE_CLIENTS = [
  {
    label: 'WEB',
    clientName: 'WEB',
    clientVersion: '2.20250101.00.00',
    clientNumeric: '1',
    userAgent: USER_AGENT_WEB,
  },
  {
    label: 'TVHTML5',
    clientName: 'TVHTML5',
    clientVersion: '7.20250101.0.0',
    clientNumeric: '7',
    userAgent: USER_AGENT_TV,
  },
  {
    label: 'IOS',
    clientName: 'IOS',
    clientVersion: '19.45.4',
    clientNumeric: '5',
    userAgent: USER_AGENT_IOS,
    deviceModel: 'iPhone16,2',
  },
];

async function fetchTranscript(videoId, { languageHint = 'pt' } = {}) {
  cancelled = false;

  let tracks = null;
  let usedClient = null;
  for (const client of INNERTUBE_CLIENTS) {
    if (cancelled) throw new Error('youtube-transcript cancelado');
    try {
      const result = await fetchPlayerViaInnertube(videoId, client, languageHint);
      if (result && Array.isArray(result) && result.length > 0) {
        tracks = result;
        usedClient = client.label;
        break;
      }
      console.warn(`[transcript-api] Innertube ${client.label}: sem captionTracks`);
    } catch (err) {
      console.warn(`[transcript-api] Innertube ${client.label} falhou: ${err.message}`);
    }
  }

  if (!tracks) {
    if (cancelled) throw new Error('youtube-transcript cancelado');
    try {
      console.log('[transcript-api] tentando fallback via scrape da pagina...');
      tracks = await fetchTracksViaPageScrape(videoId, languageHint);
      if (tracks && tracks.length > 0) {
        usedClient = 'page-scrape';
      }
    } catch (err) {
      console.warn(`[transcript-api] scrape da pagina falhou: ${err.message}`);
    }
  }

  if (!tracks || tracks.length === 0) {
    console.warn(`[transcript-api] nenhum captionTrack encontrado para ${videoId} (tentativas: Innertube WEB/TVHTML5/IOS + page scrape)`);
    return null;
  }

  console.log(`[transcript-api] ${tracks.length} track(s) via ${usedClient}: ${tracks.map((t) => `${t.languageCode}${t.kind === 'asr' ? '(asr)' : ''}`).join(', ')}`);

  const chosen = pickTrack(tracks, languageHint);
  if (!chosen || !chosen.baseUrl) {
    console.warn('[transcript-api] track escolhido sem baseUrl');
    return null;
  }
  console.log(`[transcript-api] track escolhido: lang=${chosen.languageCode} kind=${chosen.kind || 'manual'}`);

  if (cancelled) throw new Error('youtube-transcript cancelado');

  let xml;
  try {
    const resp = await axios.get(chosen.baseUrl, {
      headers: { 'User-Agent': USER_AGENT_WEB },
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

async function fetchPlayerViaInnertube(videoId, client, languageHint) {
  const body = {
    videoId,
    context: {
      client: {
        clientName: client.clientName,
        clientVersion: client.clientVersion,
        hl: languageHint,
        gl: 'BR',
        ...(client.deviceModel ? { deviceModel: client.deviceModel } : {}),
      },
    },
  };

  const resp = await axios.post(INNERTUBE_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': client.userAgent,
      'X-Goog-Api-Format-Version': '2',
      'X-YouTube-Client-Name': client.clientNumeric,
      'X-YouTube-Client-Version': client.clientVersion,
      Origin: 'https://www.youtube.com',
      Referer: 'https://www.youtube.com/',
    },
    timeout: 20000,
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const tracks = resp?.data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  return Array.isArray(tracks) && tracks.length > 0 ? tracks : null;
}

async function fetchTracksViaPageScrape(videoId, languageHint) {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=${languageHint}`;
  const resp = await axios.get(url, {
    headers: {
      'User-Agent': USER_AGENT_WEB,
      'Accept-Language': `${languageHint}-BR,${languageHint};q=0.9,en;q=0.8`,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 20000,
    validateStatus: (s) => s >= 200 && s < 400,
  });
  const html = resp.data;
  if (typeof html !== 'string') return null;
  if (html.includes('consent.youtube.com')) {
    console.warn('[transcript-api] page scrape: consent wall');
    return null;
  }
  return extractCaptionTracks(html);
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
