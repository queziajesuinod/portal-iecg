const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { VideoTranscript, YoutubeVideo } = require('../models');
const transcriptionService = require('./transcriptionService');
const audioExtraction = require('./audioExtractionService');
const whisperLocal = require('./whisperLocalService');
const youtubeTranscriptApi = require('./youtubeTranscriptApiService');
const { APP_TIMEZONE } = require('../utils/dateTime');

let isWorking = false;
let workStartedAt = null;
let currentTranscriptId = null;

function getConfig() {
  return {
    day: Number(process.env.TRANSCRIPT_WORKER_DAY ?? 2),
    hourStart: Number(process.env.TRANSCRIPT_WORKER_HOUR_START ?? 0),
    hourEnd: Number(process.env.TRANSCRIPT_WORKER_HOUR_END ?? 6),
    maxHours: Number(process.env.TRANSCRIPT_WORKER_MAX_HOURS ?? 6),
    enabled: process.env.TRANSCRIPT_WORKER_ENABLED !== 'false',
  };
}

function isInWindow() {
  const cfg = getConfig();
  const now = moment.tz(APP_TIMEZONE);
  return now.day() === cfg.day && now.hour() >= cfg.hourStart && now.hour() < cfg.hourEnd;
}

function isExceededMaxHours() {
  if (!workStartedAt) return false;
  const cfg = getConfig();
  const elapsedHours = (Date.now() - workStartedAt) / 3600000;
  return elapsedHours >= cfg.maxHours;
}

async function getNextPending() {
  return VideoTranscript.findOne({
    where: {
      status: { [Op.in]: ['pending', 'needs_audio_transcription'] },
    },
    include: [{
      model: YoutubeVideo,
      as: 'video',
      required: true,
      where: { ignored: false },
    }],
    order: [['updatedAt', 'ASC']],
  });
}

async function processNextOne({ force = false } = {}) {
  const cfg = getConfig();
  if (!cfg.enabled) {
    return { skipped: true, reason: 'worker desativado (TRANSCRIPT_WORKER_ENABLED=false)' };
  }
  if (!force && !isInWindow()) {
    return { skipped: true, reason: 'fora da janela horaria' };
  }
  if (!force && isExceededMaxHours()) {
    return { skipped: true, reason: 'maxHours excedido' };
  }

  const next = await getNextPending();
  if (!next) return { skipped: true, reason: 'fila vazia' };

  if (!workStartedAt) workStartedAt = Date.now();
  console.log(`[transcriptWorker] iniciando "${next.video.title}" (${next.video.videoId})`);

  currentTranscriptId = next.id;
  try {
    const updated = await transcriptionService.processVideoNow(next.youtubeVideoId, {
      useWhisperFallback: true,
    });
    console.log(`[transcriptWorker] concluido: status=${updated.status} source=${updated.source}`);
    return { processed: true, transcriptId: updated.id, status: updated.status };
  } catch (err) {
    console.error(`[transcriptWorker] erro ao processar ${next.video.videoId}:`, err.message);
    return { processed: false, error: err.message };
  } finally {
    currentTranscriptId = null;
  }
}

function cancelActive() {
  const killedAudio = audioExtraction.killActiveDownload();
  const killedWhisper = whisperLocal.killActiveTranscription();
  const killedTranscriptApi = youtubeTranscriptApi.killActive();
  return {
    killedAudio, killedWhisper, killedTranscriptApi, transcriptId: currentTranscriptId,
  };
}

function getCurrentTranscriptId() {
  return currentTranscriptId;
}

async function tick() {
  if (isWorking) return;
  if (!isInWindow()) {
    if (workStartedAt) {
      const elapsedHours = (Date.now() - workStartedAt) / 3600000;
      console.log(`[transcriptWorker] janela fechou (rodou ${elapsedHours.toFixed(2)}h)`);
      workStartedAt = null;
    }
    return;
  }
  if (isExceededMaxHours()) return;

  isWorking = true;
  try {
    await processNextOne();
  } finally {
    isWorking = false;
  }
}

async function runOnceForTesting() {
  if (isWorking) {
    return { skipped: true, reason: 'worker ja rodando' };
  }
  isWorking = true;
  try {
    return await processNextOne({ force: true });
  } finally {
    isWorking = false;
  }
}

function getStatus() {
  const cfg = getConfig();
  return {
    config: cfg,
    isWorking,
    workStartedAt,
    inWindow: isInWindow(),
    timezone: APP_TIMEZONE,
    now: moment.tz(APP_TIMEZONE).format(),
  };
}

module.exports = {
  tick,
  processNextOne,
  runOnceForTesting,
  getStatus,
  cancelActive,
  getCurrentTranscriptId,
};
