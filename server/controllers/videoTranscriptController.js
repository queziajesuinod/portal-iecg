const { VideoTranscript, YoutubeVideo, YoutubeChannel } = require('../models');
const transcriptionService = require('../services/transcriptionService');
const videoTranscriptWorker = require('../services/videoTranscriptWorker');
const audioStorage = require('../services/audioStorageService');

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
  try {
    const { videoId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'Arquivo de audio nao enviado' });

    const video = await YoutubeVideo.findByPk(videoId);
    if (!video) {
      await audioStorage.removeAudio(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Video nao encontrado' });
    }

    if (video.audioPath) {
      await audioStorage.removeAudio(video.audioPath).catch(() => {});
    }

    const saved = await audioStorage.saveAudio(video.videoId, req.file.path, req.file.originalname);
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

    setImmediate(() => {
      transcriptionService.processUploadedAudio(video.id).catch((err) => {
        console.error('[uploadAudio] processamento async falhou:', err.message);
      });
    });

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
    console.error('[videoTranscript] Erro no upload de audio:', err);
    return res.status(500).json({ message: err.message });
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
  uploadAudio,
  transcribeUploadedAudio,
  atualizar,
  remover,
  cancelar,
  regerarResumo,
  statusWorker,
  rodarWorkerAgora,
};
