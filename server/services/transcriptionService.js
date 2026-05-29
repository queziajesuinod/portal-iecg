const path = require('path');
const { YoutubeVideo, VideoTranscript } = require('../models');
const whisperLocal = require('./whisperLocalService');
const videoSummary = require('./videoSummaryService');
const webhookEmitter = require('./webhookEmitter');
const transcriptWebhook = require('./transcriptWebhookService');

function hasTranscriptText(transcript) {
  return Boolean(htmlToPlainText(transcript?.transcript).trim());
}

function htmlToPlainText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

async function generateAndSaveSummary(transcript, video) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[summary] ANTHROPIC_API_KEY ausente, pulando geracao de resumo');
    return null;
  }
  try {
    const { slugify } = require('../utils/slugify');
    const result = await videoSummary.generateSummary(htmlToPlainText(transcript.transcript), {
      title: video.title,
      language: transcript.language || 'pt',
    });
    transcript.summary = result.summary;
    transcript.bulletPoints = result.bulletPoints;
    transcript.seoMetaTitle = result.metaTitle || (video.title || '').slice(0, 160);
    transcript.seoMetaDescription = result.metaDescription;
    transcript.seoKeywords = result.keywords;
    transcript.seoSlug = slugify(result.slug || video.title || '');
    if (result.speaker) transcript.speaker = result.speaker;
    await transcript.save();
    console.log(`[summary] gerado para "${video.title}" (speaker="${transcript.speaker || '?'}", ${result.bulletPoints.length} bullets, ${result.keywords.length} keywords, slug="${transcript.seoSlug}")`);
    return result;
  } catch (err) {
    console.error('[summary] erro ao gerar resumo:', err.message);
    return null;
  }
}

async function getOrCreateTranscript(youtubeVideoId) {
  let transcript = await VideoTranscript.findOne({ where: { youtubeVideoId } });
  if (!transcript) {
    transcript = await VideoTranscript.create({ youtubeVideoId, status: 'pending' });
  }
  return transcript;
}

async function emitTranscriptCompletedWebhook({ video, transcript, audioPath }) {
  const payload = transcriptWebhook.buildJsonPayload({ video, transcript });
  const ext = audioPath ? (path.extname(audioPath) || '.mp3') : '.mp3';
  return webhookEmitter.emit('transcript.completed', {
    ...payload,
    __webhookTransport: {
      type: 'multipart',
      audioPath,
      filename: `${video.videoId}${ext}`,
      contentType: 'audio/mpeg',
    },
  });
}

async function processUploadedAudio(youtubeVideoId) {
  const video = await YoutubeVideo.findByPk(youtubeVideoId);
  if (!video) throw new Error('Video nao encontrado');
  if (video.ignored) {
    throw new Error('Este video esta marcado como ignorado.');
  }
  if (!video.audioPath) {
    throw new Error('Video sem audio anexado. Faca upload do audio antes.');
  }

  const transcript = await getOrCreateTranscript(youtubeVideoId);
  if (hasTranscriptText(transcript)) {
    throw new Error('Este video ja possui transcricao preenchida. Edite a transcricao e o resumo existentes.');
  }

  transcript.status = 'processing';
  transcript.errorMessage = null;
  transcript.progressPercent = 0;
  transcript.progressStage = 'whisper';
  await transcript.save();

  try {
    console.log(`[whisper] transcrevendo audio anexado de ${video.videoId} (${video.audioPath})...`);
    let lastSavedPct = 0;
    let lastSaveAt = 0;
    const VT = VideoTranscript;
    const result = await whisperLocal.transcribeAudioFile(video.audioPath, {
      languageHint: 'pt',
      onProgress: (evt) => {
        if (evt.event !== 'progress') return;
        const pct = Number(evt.percent || 0);
        const now = Date.now();
        if (pct - lastSavedPct >= 2 || (now - lastSaveAt >= 10000 && pct > lastSavedPct) || pct >= 99) {
          lastSavedPct = pct;
          lastSaveAt = now;
          VT.update(
            { progressPercent: Math.min(pct, 99.99) },
            { where: { id: transcript.id } }
          ).catch((err) => console.warn('[progress] falha ao salvar:', err.message));
        }
      },
    });

    transcript.transcript = result.text;
    transcript.language = result.language || 'pt';
    transcript.source = 'whisper';
    transcript.status = 'done';
    transcript.processedAt = new Date();
    transcript.errorMessage = null;
    transcript.progressPercent = 100;
    transcript.progressStage = 'summary';
    await transcript.save();

    await generateAndSaveSummary(transcript, video);
    transcript.progressStage = null;
    await transcript.save();

    setImmediate(() => {
      emitTranscriptCompletedWebhook({ video, transcript, audioPath: video.audioPath })
        .catch((err) => console.error('[webhook] falha ao enviar:', err.message));
    });

    return transcript;
  } catch (err) {
    transcript.status = 'failed';
    transcript.errorMessage = err.message;
    transcript.progressPercent = 0;
    transcript.progressStage = null;
    await transcript.save();
    throw err;
  }
}

async function resendWebhook(transcriptId) {
  const transcript = await VideoTranscript.findByPk(transcriptId, {
    include: [{ model: YoutubeVideo, as: 'video' }],
  });
  if (!transcript) throw new Error('Transcricao nao encontrada');
  if (!transcript.video) throw new Error('Video da transcricao nao encontrado');
  return emitTranscriptCompletedWebhook({
    video: transcript.video,
    transcript,
    audioPath: transcript.video.audioPath,
  });
}

async function cancelTranscript(transcriptId) {
  const transcript = await VideoTranscript.findByPk(transcriptId);
  if (!transcript) throw new Error('Transcricao nao encontrada');

  const worker = require('./videoTranscriptWorker');
  let killed = { killedWhisper: false };
  if (worker.getCurrentTranscriptId() === transcriptId) {
    killed = worker.cancelActive();
  }

  transcript.status = 'failed';
  transcript.errorMessage = 'Cancelada manualmente pelo administrador';
  transcript.progressPercent = 0;
  transcript.progressStage = null;
  await transcript.save();

  return { transcript, killed };
}

async function regenerateSummary(transcriptId) {
  const transcript = await VideoTranscript.findByPk(transcriptId, {
    include: [{ model: YoutubeVideo, as: 'video' }],
  });
  if (!transcript) throw new Error('Transcricao nao encontrada');
  if (!transcript.transcript) throw new Error('Transcricao sem texto para resumir');

  const { slugify } = require('../utils/slugify');
  const result = await videoSummary.generateSummary(htmlToPlainText(transcript.transcript), {
    title: transcript.video?.title,
    language: transcript.language || 'pt',
  });
  transcript.summary = result.summary;
  transcript.bulletPoints = result.bulletPoints;
  transcript.seoMetaTitle = result.metaTitle || (transcript.video?.title || '').slice(0, 160);
  transcript.seoMetaDescription = result.metaDescription;
  transcript.seoKeywords = result.keywords;
  transcript.seoSlug = slugify(result.slug || transcript.video?.title || '');
  if (result.speaker) transcript.speaker = result.speaker;
  await transcript.save();
  return transcript;
}

async function reactivateFailedTranscriptByVideoId(youtubeVideoId) {
  const video = await YoutubeVideo.findByPk(youtubeVideoId);
  if (!video) throw new Error('Video nao encontrado');

  const transcript = await VideoTranscript.findOne({ where: { youtubeVideoId } });
  if (!transcript) throw new Error('Transcricao nao encontrada');
  if (transcript.status === 'processing') {
    throw new Error('Transcricao em processamento nao pode ser reativada');
  }
  if (transcript.status !== 'failed') {
    throw new Error('Apenas transcricoes com falha podem ser reativadas');
  }

  transcript.status = 'pending';
  transcript.errorMessage = null;
  transcript.progressPercent = 0;
  transcript.progressStage = null;
  transcript.processedAt = null;
  await transcript.save();
  return transcript;
}

module.exports = {
  getOrCreateTranscript,
  processUploadedAudio,
  resendWebhook,
  regenerateSummary,
  cancelTranscript,
  reactivateFailedTranscriptByVideoId,
  hasTranscriptText,
};
