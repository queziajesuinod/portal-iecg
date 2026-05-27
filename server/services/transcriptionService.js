const { YoutubeChannel, YoutubeVideo, VideoTranscript } = require('../models');
const youtubeApi = require('./youtubeApiService');
const captionDownload = require('./captionDownloadService');
const audioExtraction = require('./audioExtractionService');
const whisperLocal = require('./whisperLocalService');
const videoSummary = require('./videoSummaryService');

async function generateAndSaveSummary(transcript, video) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[summary] ANTHROPIC_API_KEY ausente, pulando geracao de resumo');
    return null;
  }
  try {
    const result = await videoSummary.generateSummary(transcript.transcript, {
      title: video.title,
      language: transcript.language || 'pt',
    });
    transcript.summary = result.summary;
    transcript.bulletPoints = result.bulletPoints;
    await transcript.save();
    console.log(`[summary] gerado para "${video.title}" (${result.bulletPoints.length} bullets)`);
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
  if (!video) throw new Error('Video nao encontrado');

  const transcript = await getOrCreateTranscript(youtubeVideoId);
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

async function processWithWhisper(video, transcript) {
  let audioPath = null;
  const { VideoTranscript: VT } = require('../models');

  try {
    await setStage(transcript, 'audio_download', 0);
    console.log(`[whisper] baixando audio de ${video.videoId}...`);
    audioPath = await audioExtraction.downloadAudio(video.videoId);

    await setStage(transcript, 'whisper', 0);
    console.log('[whisper] transcrevendo audio (pode levar 2-3h em CPU)...');

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
  if (!video) throw new Error('Video nao encontrado');

  const channel = await YoutubeChannel.scope('withTokens').findByPk(video.youtubeChannelId);
  if (!channel) throw new Error('Canal do video nao encontrado');

  const transcript = await getOrCreateTranscript(youtubeVideoId);
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

    return await processWithWhisper(video, transcript);
  } catch (err) {
    transcript.status = 'failed';
    transcript.errorMessage = err.message;
    await transcript.save();
    throw err;
  }
}

async function cancelTranscript(transcriptId) {
  const transcript = await VideoTranscript.findByPk(transcriptId);
  if (!transcript) throw new Error('Transcricao nao encontrada');

  const worker = require('./videoTranscriptWorker');
  let killed = { killedAudio: false, killedWhisper: false };
  if (worker.getCurrentTranscriptId() === transcriptId) {
    killed = worker.cancelActive();
  }

  transcript.status = 'failed';
  transcript.errorMessage = 'Cancelada manualmente';
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

  const result = await videoSummary.generateSummary(transcript.transcript, {
    title: transcript.video?.title,
    language: transcript.language || 'pt',
  });
  transcript.summary = result.summary;
  transcript.bulletPoints = result.bulletPoints;
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
};
