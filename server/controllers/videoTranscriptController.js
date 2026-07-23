const {
  VideoTranscript, YoutubeVideo, YoutubeChannel, WebhookEventDefinition
} = require('../models');
const transcriptionService = require('../services/transcriptionService');
const videoTranscriptWorker = require('../services/videoTranscriptWorker');
const clipSelectionService = require('../services/clipSelectionService');
const clipRenderService = require('../services/clipRenderService');
const clipPublishService = require('../services/clipPublishService');
const audioStorage = require('../services/audioStorageService');
const webhookEmitter = require('../services/webhookEmitter');

async function listar(req, res) {
  try {
    const {
      status, channelId, published, category, speaker
    } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const { Op } = require('sequelize');
    const where = {};
    if (status) where.status = status;
    if (published !== undefined) where.published = published === 'true';
    if (category) where.category = category;
    if (speaker) {
      const value = String(speaker).trim();
      if (value) where.speaker = { [Op.iLike]: `%${value}%` };
    }

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
      // segments (timestamps) podem ser grandes; nao trafegam na listagem, so no detalhe.
      attributes: { exclude: ['segments'] },
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

async function listarSpeakers(req, res) {
  try {
    const { Op, fn, col } = require('sequelize');
    const search = String(req.query.search || '').trim();
    const where = {
      speaker: { [Op.ne]: null },
    };
    if (search) {
      where.speaker = { [Op.and]: [{ [Op.ne]: null }, { [Op.iLike]: `%${search}%` }] };
    }

    const rows = await VideoTranscript.findAll({
      attributes: [
        'speaker',
        [fn('COUNT', col('VideoTranscript.id')), 'count'],
        [fn('MAX', col('VideoTranscript.processedAt')), 'lastProcessedAt'],
      ],
      where,
      group: ['speaker'],
      order: [[fn('COUNT', col('VideoTranscript.id')), 'DESC']],
      raw: true,
    });

    res.status(200).json(rows.map((r) => ({
      speaker: r.speaker,
      count: Number(r.count) || 0,
      lastProcessedAt: r.lastProcessedAt,
    })));
  } catch (err) {
    console.error('[videoTranscript] Erro ao listar speakers:', err);
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
    if (req.body.speaker === null || req.body.speaker === '') {
      allowed.speaker = null;
    } else if (typeof req.body.speaker === 'string') {
      allowed.speaker = req.body.speaker.trim().slice(0, 160);
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
      speaker: transcript.speaker,
      processedAt: transcript.processedAt,
    },
  };
}

async function baixarAudio(req, res) {
  try {
    const { videoId } = req.params;
    const video = await YoutubeVideo.findByPk(videoId);
    if (!video) return res.status(404).json({ message: 'Video nao encontrado' });
    if (!video.audioPath) {
      return res.status(404).json({ message: 'Este video nao tem audio anexado' });
    }

    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(video.audioPath)) {
      return res.status(410).json({ message: 'Arquivo de audio foi removido do servidor (provavelmente apos publicacao)' });
    }

    const stat = fs.statSync(video.audioPath);
    const ext = path.extname(video.audioPath).toLowerCase();
    const mimeMap = {
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.opus': 'audio/opus',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
    };
    const contentType = mimeMap[ext] || 'audio/mpeg';

    const filename = `${video.videoId}${ext}`;
    const isDownload = req.query.download === '1' || req.query.download === 'true';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`
    );

    const { range } = req.headers;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      if (m) {
        const start = Number(m[1]);
        const end = m[2] ? Number(m[2]) : stat.size - 1;
        if (Number.isFinite(start) && start < stat.size && end >= start) {
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
          res.setHeader('Content-Length', String(end - start + 1));
          fs.createReadStream(video.audioPath, { start, end }).pipe(res);
          return null;
        }
      }
    }

    fs.createReadStream(video.audioPath).pipe(res);
    return null;
  } catch (err) {
    console.error('[videoTranscript] erro ao servir audio:', err);
    return res.status(500).json({ message: err.message });
  }
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

async function reativarTranscricao(req, res) {
  try {
    const result = await transcriptionService.reactivateFailedTranscriptByVideoId(req.params.videoId);
    res.status(200).json(result);
  } catch (err) {
    console.error('[videoTranscript] Erro ao reativar:', err.message);
    res.status(400).json({ message: err.message });
  }
}

async function enfileirarParaHelper(req, res) {
  try {
    const result = await transcriptionService.markTranscriptPending(req.params.videoId);
    res.status(200).json(result);
  } catch (err) {
    console.error('[videoTranscript] Erro ao enfileirar:', err.message);
    res.status(400).json({ message: err.message });
  }
}

async function solicitarRecortes(req, res) {
  try {
    const result = await transcriptionService.requestClips(req.params.videoId);
    res.status(200).json(result);
  } catch (err) {
    console.error('[videoTranscript] Erro ao solicitar recortes:', err.message);
    res.status(400).json({ message: err.message });
  }
}

async function sugerirRecortes(req, res) {
  try {
    const result = await clipSelectionService.suggestClips(req.params.videoId, req.body || {});
    res.status(200).json(result);
  } catch (err) {
    console.error('[videoTranscript] Erro ao sugerir recortes:', err.message);
    res.status(400).json({ message: err.message });
  }
}

async function listarRecortes(req, res) {
  try {
    const clips = await clipSelectionService.listClips(req.params.videoId);
    res.status(200).json({ items: clips, count: clips.length });
  } catch (err) {
    console.error('[videoTranscript] Erro ao listar recortes:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function editarRecorte(req, res) {
  try {
    const clip = await clipSelectionService.updateClip(req.params.clipId, req.body || {});
    res.status(200).json(clip);
  } catch (err) {
    console.error('[videoTranscript] Erro ao editar recorte:', err.message);
    res.status(400).json({ message: err.message });
  }
}

async function aprovarRecorte(req, res) {
  try {
    const clip = await clipSelectionService.approveClip(req.params.clipId);
    res.status(200).json(clip);
  } catch (err) {
    console.error('[videoTranscript] Erro ao aprovar recorte:', err.message);
    res.status(400).json({ message: err.message });
  }
}

async function descartarRecorte(req, res) {
  try {
    const clip = await clipSelectionService.discardClip(req.params.clipId);
    res.status(200).json(clip);
  } catch (err) {
    console.error('[videoTranscript] Erro ao descartar recorte:', err.message);
    res.status(400).json({ message: err.message });
  }
}

async function renderizarRecorte(req, res) {
  try {
    const { VideoClip } = require('../models');
    const clip = await VideoClip.findByPk(req.params.clipId);
    if (!clip) return res.status(404).json({ message: 'Recorte nao encontrado' });
    if (clip.status === 'rendering') return res.status(409).json({ message: 'Recorte ja esta renderizando' });

    // Renderiza em background (ffmpeg pode levar de segundos a minutos).
    // O proprio renderClip marca status 'rendering' -> 'rendered'/'failed'.
    setImmediate(() => {
      clipRenderService.renderClip(clip.id).catch((err) => {
        console.error('[videoTranscript] render em background falhou:', err.message);
      });
    });
    return res.status(202).json({ id: clip.id, status: 'rendering' });
  } catch (err) {
    console.error('[videoTranscript] Erro ao renderizar recorte:', err.message);
    return res.status(400).json({ message: err.message });
  }
}

async function servirRecorte(req, res) {
  try {
    const { VideoClip } = require('../models');
    const fs = require('fs');

    const clip = await VideoClip.findByPk(req.params.clipId, {
      include: [{ model: YoutubeVideo, as: 'video', attributes: ['videoId'] }],
    });
    if (!clip) return res.status(404).json({ message: 'Recorte nao encontrado' });
    if (!clip.filePath) return res.status(404).json({ message: 'Recorte ainda nao foi renderizado' });
    if (!fs.existsSync(clip.filePath)) {
      return res.status(410).json({ message: 'Arquivo do recorte foi removido do servidor' });
    }

    const stat = fs.statSync(clip.filePath);
    const filename = `${clip.video?.videoId || 'clip'}-${clip.position}.mp4`;
    const isDownload = req.query.download === '1' || req.query.download === 'true';

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`
    );

    const { range } = req.headers;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      if (m) {
        const start = Number(m[1]);
        const end = m[2] ? Number(m[2]) : stat.size - 1;
        if (Number.isFinite(start) && start < stat.size && end >= start) {
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
          res.setHeader('Content-Length', String(end - start + 1));
          fs.createReadStream(clip.filePath, { start, end }).pipe(res);
          return null;
        }
      }
    }

    fs.createReadStream(clip.filePath).pipe(res);
    return null;
  } catch (err) {
    console.error('[videoTranscript] erro ao servir recorte:', err.message);
    return res.status(500).json({ message: err.message });
  }
}

async function publicarRecorte(req, res) {
  try {
    const { VideoClip } = require('../models');
    const clip = await VideoClip.findByPk(req.params.clipId);
    if (!clip) return res.status(404).json({ message: 'Recorte nao encontrado' });
    if (clip.status !== 'rendered') {
      return res.status(400).json({ message: `Recorte precisa estar 'rendered' para publicar (atual: ${clip.status})` });
    }

    // Publica em background (upload pode demorar).
    setImmediate(() => {
      clipPublishService.publishClip(clip.id, req.body || {}).catch((err) => {
        console.error('[videoTranscript] publish em background falhou:', err.message);
      });
    });
    return res.status(202).json({ id: clip.id, status: 'publishing' });
  } catch (err) {
    console.error('[videoTranscript] Erro ao publicar recorte:', err.message);
    return res.status(400).json({ message: err.message });
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
  listarSpeakers,
  buscarPorId,
  buscarProgresso,
  buscarProgressoBatch,
  uploadAudio,
  baixarAudio,
  transcribeUploadedAudio,
  atualizar,
  remover,
  cancelar,
  reativarTranscricao,
  enfileirarParaHelper,
  solicitarRecortes,
  sugerirRecortes,
  listarRecortes,
  editarRecorte,
  aprovarRecorte,
  descartarRecorte,
  renderizarRecorte,
  servirRecorte,
  publicarRecorte,
  regerarResumo,
  reenviarWebhook,
  statusWorker,
  rodarWorkerAgora,
};
