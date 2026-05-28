const {
  VideoTranscript, YoutubeVideo, YoutubeChannel, WebhookEventDefinition
} = require('../models');
const transcriptionService = require('../services/transcriptionService');
const videoTranscriptWorker = require('../services/videoTranscriptWorker');
const audioStorage = require('../services/audioStorageService');
const webhookEmitter = require('../services/webhookEmitter');

async function listar(req, res) {
  try {
    const {
      status, channelId, published, category
    } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const where = {};
    if (status) where.status = status;
    if (published !== undefined) where.published = published === 'true';
    if (category) where.category = category;

    const include = [
      {
        model: YoutubeVideo,
        as: 'video',
        required: true,
        ...(channelId ? { where: { youtubeChannelId: channelId } } : {}),
        include: [{ model: YoutubeChannel, as: 'channel' }],
      },
    ];

    const { rows, count } = await VideoTranscript.findAndCountAll({
      where,
      include,
      order: [['updatedAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    res.status(200).json({
      items: rows, total: count, limit, offset
    });
  } catch (err) {
    console.error('[videoTranscript] Erro ao listar:', err);
    res.status(500).json({ message: err.message });
  }
}

async function buscarPorId(req, res) {
  try {
    const transcript = await VideoTranscript.findByPk(req.params.id, {
      include: [
        {
          model: YoutubeVideo,
          as: 'video',
          include: [{ model: YoutubeChannel, as: 'channel' }],
        },
      ],
    });
    if (!transcript) return res.status(404).json({ message: 'Transcrição não encontrada' });
    return res.status(200).json(transcript);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function buscarProgresso(req, res) {
  try {
    const transcript = await VideoTranscript.findByPk(req.params.id, {
      attributes: [
        'id',
        'status',
        'source',
        'progressPercent',
        'progressStage',
        'errorMessage',
        'processedAt',
        'updatedAt',
      ],
    });
    if (!transcript) return res.status(404).json({ message: 'Transcrição não encontrada' });
    return res.status(200).json(transcript);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function buscarProgressoBatch(req, res) {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return res.status(200).json([]);

    const transcripts = await VideoTranscript.findAll({
      where: { id: ids },
      attributes: [
        'id',
        'status',
        'source',
        'progressPercent',
        'progressStage',
        'errorMessage',
        'processedAt',
        'updatedAt',
      ],
    });
    return res.status(200).json(transcripts);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function uploadAudio(req, res) {
  const requestId = req.uploadRequestId || 'no-request-id';
  const startedAt = req.uploadStartedAt || Date.now();
  try {
    const { videoId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'Arquivo de audio nao enviado' });
    console.log(
      `[uploadAudio][${requestId}] controller_start videoId=${videoId} tmpPath=${req.file.path} originalName=${req.file.originalname} size=${req.file.size || 0}`
    );

    const video = await YoutubeVideo.findByPk(videoId);
    if (!video) {
      await audioStorage.removeAudio(req.file.path).catch(() => {});
      console.warn(`[uploadAudio][${requestId}] video_not_found videoId=${videoId}`);
      return res.status(404).json({ message: 'Video nao encontrado' });
    }

    if (video.audioPath) {
      await audioStorage.removeAudio(video.audioPath).catch(() => {});
    }

    const saved = await audioStorage.saveAudio(video.videoId, req.file.path, req.file.originalname);
    console.log(
      `[uploadAudio][${requestId}] saved videoId=${videoId} finalPath=${saved.path} finalSize=${saved.size}`
    );
    await video.update({
      audioPath: saved.path,
      audioSizeBytes: saved.size,
      audioUploadedAt: new Date(),
    });

    const transcript = await transcriptionService.getOrCreateTranscript(video.id);
    if (transcript.status !== 'processing') {
      transcript.status = 'pending';
      transcript.errorMessage = null;
      transcript.progressPercent = 0;
      transcript.progressStage = null;
      transcript.processedAt = null;
      await transcript.save();
    }

    return res.status(200).json({
      video: {
        id: video.id,
        videoId: video.videoId,
        audioPath: saved.path,
        audioSizeBytes: saved.size,
        audioUploadedAt: video.audioUploadedAt,
      },
      transcript,
    });
  } catch (err) {
    if (req.file?.path) {
      await audioStorage.removeAudio(req.file.path).catch(() => {});
    }
    console.error(`[uploadAudio][${requestId}] controller_error videoId=${req.params.videoId} message=${err.message}`);
    console.error('[videoTranscript] Erro no upload de audio:', err);
    return res.status(500).json({ message: err.message });
  } finally {
    const elapsedMs = Date.now() - startedAt;
    console.log(`[uploadAudio][${requestId}] finished videoId=${req.params.videoId} elapsedMs=${elapsedMs}`);
  }
}

async function transcribeUploadedAudio(req, res) {
  try {
    const { videoId } = req.params;
    const transcript = await transcriptionService.processUploadedAudio(videoId);
    res.status(200).json(transcript);
  } catch (err) {
    console.error('[videoTranscript] Erro ao transcrever audio anexado:', err);
    res.status(500).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const transcript = await VideoTranscript.findByPk(req.params.id);
    if (!transcript) return res.status(404).json({ message: 'Transcrição não encontrada' });

    const allowed = {};
    if (typeof req.body.transcript === 'string') allowed.transcript = req.body.transcript;
    if (typeof req.body.summary === 'string') allowed.summary = req.body.summary;
    if (Array.isArray(req.body.bulletPoints)) allowed.bulletPoints = req.body.bulletPoints;
    if (typeof req.body.published === 'boolean') allowed.published = req.body.published;
    if (typeof req.body.seoMetaTitle === 'string') allowed.seoMetaTitle = req.body.seoMetaTitle.slice(0, 160);
    if (typeof req.body.seoMetaDescription === 'string') allowed.seoMetaDescription = req.body.seoMetaDescription.slice(0, 320);
    if (Array.isArray(req.body.seoKeywords)) {
      allowed.seoKeywords = req.body.seoKeywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim().toLowerCase());
    }
    if (typeof req.body.seoSlug === 'string') {
      const { slugify } = require('../utils/slugify');
      allowed.seoSlug = slugify(req.body.seoSlug, { maxLength: 200 });
    }
    if (req.body.category === null || req.body.category === '') {
      allowed.category = null;
    } else if (typeof req.body.category === 'string') {
      allowed.category = req.body.category.trim().slice(0, 80);
    }

    const wasPublished = transcript.published;
    await transcript.update(allowed);

    const publishedChanged = typeof allowed.published === 'boolean' && allowed.published !== wasPublished;

    if (publishedChanged) {
      const video = await YoutubeVideo.findByPk(transcript.youtubeVideoId, {
        include: [{ model: YoutubeChannel, as: 'channel' }],
      });

      const dynamicEvents = await WebhookEventDefinition.findAll({
        where: {
          tableName: 'video_transcripts',
          fieldName: 'published',
          changeType: 'UPDATE',
        },
      });

      const turnedOn = allowed.published === true && !wasPublished;
      const richPayload = buildPublishedPayload({
        video,
        transcript,
        previousPublished: wasPublished,
        currentPublished: transcript.published,
      });

      const attachAudio = turnedOn && Boolean(video?.audioPath);
      const ext = attachAudio ? (require('path').extname(video.audioPath) || '.mp3') : '.mp3';
      const transport = attachAudio ? {
        type: 'multipart',
        audioPath: video.audioPath,
        filename: `${video.videoId}${ext}`,
        contentType: 'audio/mpeg',
      } : null;

      let allDelivered = true;
      for (const def of dynamicEvents) {
        try {
          const result = await webhookEmitter.emit(def.eventKey, {
            ...richPayload,
            ...(transport ? { __webhookTransport: transport } : {}),
          });
          const failed = Number(result?.failed || 0);
          if (failed > 0) {
            allDelivered = false;
            console.warn(`[publish] evento ${def.eventKey} falhou em ${failed}/${result.total} webhooks`);
          }
        } catch (err) {
          allDelivered = false;
          console.warn(`[publish] erro emitindo ${def.eventKey}:`, err.message);
        }
      }

      if (turnedOn && attachAudio) {
        if (allDelivered) {
          await audioStorage.removeAudio(video.audioPath).catch((err) => {
            console.warn('[publish] falha ao remover audio:', err.message);
          });
          await video.update({ audioPath: null, audioSizeBytes: null, audioUploadedAt: null });
          console.log(`[publish] audio removido apos webhook 200 do video ${video.videoId}`);
        } else {
          console.warn(`[publish] webhook nao retornou 200; audio MANTIDO em ${video.audioPath} pra reenvio manual`);
        }
      }
    }

    return res.status(200).json(transcript);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

function buildPublishedPayload({
  video, transcript, previousPublished, currentPublished,
}) {
  return {
    event: 'video_transcript.published',
    transcriptId: transcript.id,
    youtubeVideoId: transcript.youtubeVideoId,
    previousPublished,
    currentPublished,
    updatedAt: transcript.updatedAt,
    video: video ? {
      id: video.id,
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      publishedAt: video.publishedAt,
      durationSeconds: video.durationSeconds,
      thumbnailUrl: video.thumbnailUrl,
      youtubeUrl: `https://youtu.be/${video.videoId}`,
      audioPath: video.audioPath,
      audioSizeBytes: video.audioSizeBytes,
      audioUploadedAt: video.audioUploadedAt,
      channel: video.channel ? {
        id: video.channel.id,
        channelId: video.channel.channelId,
        channelTitle: video.channel.channelTitle,
        ownerName: video.channel.ownerName,
      } : null,
    } : null,
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

async function reenviarWebhook(req, res) {
  try {
    const result = await transcriptionService.resendWebhook(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    console.error('[videoTranscript] Erro ao reenviar webhook:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function remover(req, res) {
  try {
    const transcript = await VideoTranscript.findByPk(req.params.id);
    if (!transcript) return res.status(404).json({ message: 'Transcrição não encontrada' });
    await transcript.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function cancelar(req, res) {
  try {
    const result = await transcriptionService.cancelTranscript(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    console.error('[videoTranscript] Erro ao cancelar:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function regerarResumo(req, res) {
  try {
    const transcript = await transcriptionService.regenerateSummary(req.params.id);
    res.status(200).json(transcript);
  } catch (err) {
    console.error('[videoTranscript] Erro ao regenerar resumo:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function statusWorker(req, res) {
  try {
    res.status(200).json(videoTranscriptWorker.getStatus());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function rodarWorkerAgora(req, res) {
  try {
    const result = await videoTranscriptWorker.runOnceForTesting();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  listar,
  buscarPorId,
  buscarProgresso,
  buscarProgressoBatch,
  uploadAudio,
  transcribeUploadedAudio,
  atualizar,
  remover,
  cancelar,
  regerarResumo,
  reenviarWebhook,
  statusWorker,
  rodarWorkerAgora,
};
