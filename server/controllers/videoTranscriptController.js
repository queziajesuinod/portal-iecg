const { VideoTranscript, YoutubeVideo, YoutubeChannel } = require('../models');
const transcriptionService = require('../services/transcriptionService');
const videoTranscriptWorker = require('../services/videoTranscriptWorker');

async function listar(req, res) {
  try {
    const { status, channelId, published } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const where = {};
    if (status) where.status = status;
    if (published !== undefined) where.published = published === 'true';

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

async function enfileirar(req, res) {
  try {
    const videoIds = Array.isArray(req.body.videoIds) ? req.body.videoIds : [];
    if (!videoIds.length) return res.status(400).json({ message: 'videoIds é obrigatório' });

    const enqueued = [];
    for (const id of videoIds) {
      try {
        const t = await transcriptionService.enqueueVideo(id);
        enqueued.push({ videoId: id, transcriptId: t.id, status: t.status });
      } catch (err) {
        enqueued.push({ videoId: id, error: err.message });
      }
    }

    return res.status(200).json({ enqueued });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function processarAgora(req, res) {
  try {
    const { videoId } = req.params;
    const transcript = await transcriptionService.processVideoNow(videoId);
    res.status(200).json(transcript);
  } catch (err) {
    console.error('[videoTranscript] Erro ao processar:', err);
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

    await transcript.update(allowed);
    return res.status(200).json(transcript);
  } catch (err) {
    return res.status(400).json({ message: err.message });
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
  enfileirar,
  processarAgora,
  atualizar,
  remover,
  cancelar,
  regerarResumo,
  statusWorker,
  rodarWorkerAgora,
};
