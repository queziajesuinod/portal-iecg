const { Op } = require('sequelize');
const { YoutubeChannel, YoutubeVideo, VideoTranscript } = require('../models');
const youtubeApi = require('../services/youtubeApiService');

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

    const { rows, count } = await YoutubeVideo.findAndCountAll({
      where,
      include: [
        {
          model: VideoTranscript,
          as: 'transcript',
          attributes: ['id', 'status', 'source', 'published', 'errorMessage', 'processedAt', 'progressPercent', 'progressStage'],
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
    if (!channel) return res.status(404).json({ message: 'Canal nao encontrado' });
    if (!channel.getRefreshToken()) {
      return res.status(400).json({ message: 'Canal sem refresh_token. Refaca a autorizacao OAuth.' });
    }

    const maxPages = Math.min(Number(req.body.maxPages) || 5, 20);
    const videos = await youtubeApi.syncChannelVideos(channel, { maxPages });

    let created = 0;
    let updated = 0;
    for (const video of videos) {
      const existing = await YoutubeVideo.findOne({ where: { videoId: video.videoId } });
      if (existing) {
        await existing.update(video);
        updated += 1;
      } else {
        await YoutubeVideo.create({ ...video, youtubeChannelId: channelId });
        created += 1;
      }
    }

    channel.lastSyncedAt = new Date();
    await channel.save();

    return res.status(200).json({ created, updated, total: videos.length });
  } catch (err) {
    console.error('[youtubeVideo] Erro no sync:', err);
    return res.status(500).json({ message: err.message });
  }
}

async function atualizarCaptions(req, res) {
  try {
    const { id } = req.params;
    const video = await YoutubeVideo.findByPk(id);
    if (!video) return res.status(404).json({ message: 'Video nao encontrado' });

    const channel = await YoutubeChannel.scope('withTokens').findByPk(video.youtubeChannelId);
    if (!channel) return res.status(404).json({ message: 'Canal do video nao encontrado' });

    const info = await youtubeApi.fetchCaptionInfo(channel, video.videoId);
    await video.update(info);

    return res.status(200).json(video);
  } catch (err) {
    console.error('[youtubeVideo] Erro ao verificar captions:', err);
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  listarPorCanal,
  sincronizarCanal,
  atualizarCaptions,
};
