const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

function getWebhookUrl() {
  return (process.env.TRANSCRIPT_WEBHOOK_URL || '').trim();
}

function getWebhookSecret() {
  return (process.env.TRANSCRIPT_WEBHOOK_SECRET || '').trim();
}

function isEnabled() {
  return Boolean(getWebhookUrl());
}

function buildJsonPayload({ video, transcript }) {
  return {
    event: 'transcript.completed',
    timestamp: new Date().toISOString(),
    video: {
      id: video.id,
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      publishedAt: video.publishedAt,
      durationSeconds: video.durationSeconds,
      thumbnailUrl: video.thumbnailUrl,
      youtubeUrl: `https://youtu.be/${video.videoId}`,
    },
    transcript: {
      id: transcript.id,
      status: transcript.status,
      source: transcript.source,
      language: transcript.language,
      text: transcript.transcript,
      summary: transcript.summary,
      bulletPoints: transcript.bulletPoints,
      seoMetaTitle: transcript.seoMetaTitle,
      seoMetaDescription: transcript.seoMetaDescription,
      seoKeywords: transcript.seoKeywords,
      seoSlug: transcript.seoSlug,
      category: transcript.category,
      processedAt: transcript.processedAt,
    },
  };
}

async function send({ video, transcript, audioPath }) {
  const url = getWebhookUrl();
  if (!url) {
    return { skipped: true, reason: 'TRANSCRIPT_WEBHOOK_URL nao configurado' };
  }

  const payload = buildJsonPayload({ video, transcript });
  const form = new FormData();
  form.append('payload', JSON.stringify(payload), {
    filename: 'payload.json',
    contentType: 'application/json',
  });

  let audioAttached = false;
  let audioSize = 0;
  if (audioPath) {
    try {
      const stat = await fsp.stat(audioPath);
      if (stat.size > 0) {
        form.append('audio', fs.createReadStream(audioPath), {
          filename: `${video.videoId}${path.extname(audioPath) || '.mp3'}`,
          contentType: 'audio/mpeg',
          knownLength: stat.size,
        });
        audioAttached = true;
        audioSize = stat.size;
      }
    } catch (err) {
      console.warn(`[webhook] audio nao acessivel (${audioPath}): ${err.message}`);
    }
  }

  const headers = { ...form.getHeaders() };
  const secret = getWebhookSecret();
  if (secret) headers['X-Webhook-Secret'] = secret;

  console.log(`[webhook] enviando pra ${url} (audio=${audioAttached ? `${(audioSize / 1024 / 1024).toFixed(2)}MB` : 'nao'})`);

  const resp = await axios.post(url, form, {
    headers,
    timeout: 600000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    validateStatus: (s) => s >= 200 && s < 500,
  });

  if (resp.status >= 400) {
    const body = typeof resp.data === 'string' ? resp.data.slice(0, 500) : JSON.stringify(resp.data).slice(0, 500);
    throw new Error(`Webhook respondeu ${resp.status}: ${body}`);
  }

  console.log(`[webhook] entregue (status=${resp.status})`);
  return {
    delivered: true,
    status: resp.status,
    audioAttached,
    audioSize,
  };
}

module.exports = {
  isEnabled,
  send,
  buildJsonPayload,
};
