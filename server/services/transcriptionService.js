const { YoutubeChannel, YoutubeVideo, VideoTranscript } = require('../models');
const youtubeApi = require('./youtubeApiService');
const captionDownload = require('./captionDownloadService');
const audioExtraction = require('./audioExtractionService');
const whisperLocal = require('./whisperLocalService');
const videoSummary = require('./videoSummaryService');

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
    console.warn('[summary] ANTHROPIC_API_KEY ausente, pulando geração de resumo');
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
    await transcript.save();
    console.log(`[summary] gerado para "${video.title}" (${result.bulletPoints.length} bullets, ${result.keywords.length} keywords, slug="${transcript.seoSlug}")`);
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

async function enqueueVideo(youtubeVideoId) {
  const video = await YoutubeVideo.findByPk(youtubeVideoId);
  if (!video) throw new Error('Vídeo não encontrado');
  if (video.ignored) {
    throw new Error('Este vídeo está marcado como ignorado e não pode ser processado.');
  }

  const transcript = await getOrCreateTranscript(youtubeVideoId);
  if (hasTranscriptText(transcript)) {
    throw new Error('Este vídeo já possui transcrição preenchida. Edite a transcrição e o resumo existentes.');
  }
  if (transcript.status === 'processing') {
    return transcript;
  }

  transcript.status = 'pending';
  transcript.errorMessage = null;
  await transcript.save();
  return transcript;
}

async function setStage(transcript, stage, percent = 0) {
  transcript.progressStage = stage;
  transcript.progressPercent = percent;
  await transcript.save();
}

async function processFromManualCaption(video, channel, transcript) {
  if (video.hasManualCaption === null || video.hasManualCaption === undefined) {
    const info = await youtubeApi.fetchCaptionInfo(channel, video.videoId);
    await video.update(info);
  }

  if (!video.hasManualCaption) {
    return null;
  }

  await setStage(transcript, 'caption', 50);
  const result = await captionDownload.downloadManualCaptionAsText(channel, video.videoId);
  if (!result || !result.text) {
    return null;
  }

  transcript.transcript = result.text;
  transcript.language = result.language;
  transcript.source = result.source;
  transcript.status = 'done';
  transcript.processedAt = new Date();
  transcript.errorMessage = null;
  transcript.progressPercent = 100;
  transcript.progressStage = 'summary';
  await transcript.save();
  await generateAndSaveSummary(transcript, video);
  transcript.progressStage = null;
  await transcript.save();
  return transcript;
}

async function processWithWhisper(video, transcript, channel) {
  let audioPath = null;
  const { VideoTranscript: VT } = require('../models');
  const channelCookies = channel?.getYtDlpCookies?.() || null;

  try {
    await setStage(transcript, 'audio_download', 0);
    console.log(`[whisper] baixando áudio de ${video.videoId}${channelCookies ? ' (com cookies do canal)' : ''}...`);
    audioPath = await audioExtraction.downloadAudio(video.videoId, { cookies: channelCookies });

    await setStage(transcript, 'whisper', 0);
    console.log('[whisper] transcrevendo áudio (pode levar 2-3h em CPU)...');

    let lastSavedPct = 0;
    let lastSaveAt = 0;
    const result = await whisperLocal.transcribeAudioFile(audioPath, {
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
    transcript.language = result.language;
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
    return transcript;
  } finally {
    await audioExtraction.cleanupFile(audioPath);
  }
}

async function processVideoNow(youtubeVideoId, { useWhisperFallback = false } = {}) {
  const video = await YoutubeVideo.findByPk(youtubeVideoId);
  if (!video) throw new Error('Vídeo não encontrado');
  if (video.ignored) {
    throw new Error('Este vídeo está marcado como ignorado e não pode ser processado.');
  }

  const channel = await YoutubeChannel.scope('withTokens').findByPk(video.youtubeChannelId);
  if (!channel) throw new Error('Canal do vídeo não encontrado');

  const transcript = await getOrCreateTranscript(youtubeVideoId);
  if (hasTranscriptText(transcript)) {
    throw new Error('Este vídeo já possui transcrição preenchida. Edite a transcrição e o resumo existentes.');
  }
  transcript.status = 'processing';
  transcript.errorMessage = null;
  transcript.progressPercent = 0;
  transcript.progressStage = null;
  await transcript.save();

  try {
    const fromCaption = await processFromManualCaption(video, channel, transcript);
    if (fromCaption) return fromCaption;

    if (!useWhisperFallback) {
      transcript.status = 'needs_audio_transcription';
      transcript.processedAt = null;
      await transcript.save();
      return transcript;
    }

    return await processWithWhisper(video, transcript, channel);
  } catch (err) {
    transcript.status = 'failed';
    transcript.errorMessage = err.message;
    await transcript.save();
    throw err;
  }
}

async function cancelTranscript(transcriptId) {
  const transcript = await VideoTranscript.findByPk(transcriptId);
  if (!transcript) throw new Error('Transcrição não encontrada');

  const worker = require('./videoTranscriptWorker');
  let killed = { killedAudio: false, killedWhisper: false };
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
  if (!transcript) throw new Error('Transcrição não encontrada');
  if (!transcript.transcript) throw new Error('Transcrição sem texto para resumir');

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
  await transcript.save();
  return transcript;
}

async function reactivateFailedTranscriptByVideoId(youtubeVideoId) {
  const video = await YoutubeVideo.findByPk(youtubeVideoId);
  if (!video) throw new Error('Vídeo não encontrado');

  const transcript = await VideoTranscript.findOne({ where: { youtubeVideoId } });
  if (!transcript) throw new Error('Transcrição não encontrada');
  if (transcript.status === 'processing') {
    throw new Error('Transcrição em processamento não pode ser reativada');
  }
  if (transcript.status !== 'failed') {
    throw new Error('Apenas transcrições com falha podem ser reativadas');
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
  enqueueVideo,
  processVideoNow,
  processWithWhisper,
  regenerateSummary,
  cancelTranscript,
  reactivateFailedTranscriptByVideoId,
  hasTranscriptText,
};
