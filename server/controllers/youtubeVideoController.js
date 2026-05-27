const { Op } = require('sequelize');
const {
  sequelize, YoutubeChannel, YoutubeVideo, VideoTranscript
} = require('../models');
const youtubeApi = require('../services/youtubeApiService');
const channelSync = require('../services/channelSyncService');
const transcriptionService = require('../services/transcriptionService');

async function listarPorCanal(req, res) {
  try {
    const { channelId } = req.params;
    const { search } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const where = { youtubeChannelId: channelId };
    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }
    if (req.query.includeIgnored !== 'true') {
      where.ignored = false;
    }

    const { rows, count } = await YoutubeVideo.findAndCountAll({
      where,
      include: [
        {
          model: VideoTranscript,
          as: 'transcript',
          attributes: [
            'id',
            'status',
            'source',
            'published',
            'errorMessage',
            'processedAt',
            'progressPercent',
            'progressStage',
            [
              sequelize.literal(
                'CASE WHEN "transcript"."transcript" IS NOT NULL AND length(trim("transcript"."transcript")) > 0 THEN true ELSE false END'
              ),
              'hasText',
            ],
          ],
        },
      ],
      order: [['publishedAt', 'DESC']],
      limit,
      offset,
    });

    res.status(200).json({
      items: rows, total: count, limit, offset
    });
  } catch (err) {
    console.error('[youtubeVideo] Erro ao listar:', err);
    res.status(500).json({ message: err.message });
  }
}

async function sincronizarCanal(req, res) {
  try {
    const { channelId } = req.params;
    const channel = await YoutubeChannel.scope('withTokens').findByPk(channelId);
    if (!channel) return res.status(404).json({ message: 'Canal não encontrado' });
    if (!channel.getRefreshToken()) {
      return res.status(400).json({ message: 'Canal sem refresh_token. Refaça a autorização OAuth.' });
    }

    const maxPages = Math.min(Number(req.body.maxPages) || 5, 20);
    const result = await channelSync.syncSingleChannel(channel, { maxPages });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[youtubeVideo] Erro no sync:', err);
    return res.status(500).json({ message: err.message });
  }
}

async function alternarIgnorado(req, res) {
  try {
    const { id } = req.params;
    const video = await YoutubeVideo.findByPk(id);
    if (!video) return res.status(404).json({ message: 'Vídeo não encontrado' });

    const ignored = typeof req.body.ignored === 'boolean' ? req.body.ignored : !video.ignored;
    const ignoreReason = ignored ? (req.body.ignoreReason || 'manual') : null;

    await video.update({ ignored, ignoreReason });
    return res.status(200).json(video);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function atualizarCaptions(req, res) {
  try {
    const { id } = req.params;
    const video = await YoutubeVideo.findByPk(id);
    if (!video) return res.status(404).json({ message: 'Vídeo não encontrado' });

    const channel = await YoutubeChannel.scope('withTokens').findByPk(video.youtubeChannelId);
    if (!channel) return res.status(404).json({ message: 'Canal do vídeo não encontrado' });

    const info = await youtubeApi.fetchCaptionInfo(channel, video.videoId);
    await video.update(info);

    return res.status(200).json(video);
  } catch (err) {
    console.error('[youtubeVideo] Erro ao verificar captions:', err);
    return res.status(500).json({ message: err.message });
  }
}

async function reativarTranscricaoFalha(req, res) {
  try {
    const { id } = req.params;
    const transcript = await transcriptionService.reactivateFailedTranscriptByVideoId(id);
    return res.status(200).json(transcript);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function removerVideo(req, res) {
  try {
    const { id } = req.params;
    const video = await YoutubeVideo.findByPk(id, {
      include: [{ model: VideoTranscript, as: 'transcript' }],
    });
    if (!video) return res.status(404).json({ message: 'Vídeo não encontrado' });
    if (video.transcript?.status === 'processing') {
      return res.status(400).json({ message: 'Não é possível excluir vídeo com transcrição em processamento' });
    }

    await video.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listarPorCanal,
  sincronizarCanal,
  atualizarCaptions,
  alternarIgnorado,
  reativarTranscricaoFalha,
  removerVideo,
};
