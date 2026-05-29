const { Op } = require('sequelize');
const { YoutubeVideo, YoutubeChannel, VideoTranscript } = require('../models');
const audioStorage = require('../services/audioStorageService');
const transcriptionService = require('../services/transcriptionService');

async function listarVideosPendentes(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const where = { ignored: false, audioPath: null };
    if (req.query.channelId) {
      where.youtubeChannelId = req.query.channelId;
    }

    const videos = await YoutubeVideo.findAll({
      where,
      include: [
        { model: YoutubeChannel, as: 'channel' },
        {
          model: VideoTranscript,
          as: 'transcript',
          required: false,
          where: { status: { [Op.in]: ['pending', 'processing', 'failed'] } },
        },
      ],
      order: [['publishedAt', 'DESC']],
      limit,
    });

    const items = videos.map((v) => ({
      id: v.id,
      videoId: v.videoId,
      title: v.title,
      publishedAt: v.publishedAt,
      durationSeconds: v.durationSeconds,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
      channel: v.channel ? {
        id: v.channel.id,
        channelId: v.channel.channelId,
        channelName: v.channel.channelName,
      } : null,
      transcriptStatus: v.transcript?.status || null,
    }));

    res.status(200).json({ items, count: items.length });
  } catch (err) {
    console.error('[helper] erro ao listar pendentes:', err);
    res.status(500).json({ message: err.message });
  }
}

async function listarChannelsComPendencias(req, res) {
  try {
    const { sequelize } = require('../models');
    const channels = await YoutubeChannel.findAll({
      attributes: [
        'id',
        'channelId',
        'channelName',
        'ownerName',
        [
          sequelize.literal(`(
            SELECT COUNT(*)::int FROM "${process.env.DB_SCHEMA || 'dev_iecg'}"."youtube_videos" v
            WHERE v."youtubeChannelId" = "YoutubeChannel"."id"
              AND v."ignored" = false
              AND v."audioPath" IS NULL
          )`),
          'pendingCount',
        ],
      ],
      order: [['channelName', 'ASC']],
    });

    res.status(200).json(channels.map((c) => ({
      id: c.id,
      channelId: c.channelId,
      channelName: c.channelName,
      ownerName: c.ownerName,
      pendingCount: Number(c.get('pendingCount')) || 0,
    })));
  } catch (err) {
    console.error('[helper] erro ao listar channels:', err);
    res.status(500).json({ message: err.message });
  }
}

async function uploadAudioHelper(req, res) {
  try {
    const { videoId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'Arquivo de audio nao enviado' });

    const video = await YoutubeVideo.findOne({ where: { videoId } });
    if (!video) {
      await audioStorage.removeAudio(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Video nao encontrado pelo videoId do YouTube' });
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
        console.error('[helper-upload] processamento async falhou:', err.message);
      });
    });

    console.log(`[helper] audio recebido pra ${video.videoId} (${(saved.size / 1024 / 1024).toFixed(2)} MB)`);
    return res.status(200).json({
      video: {
        id: video.id,
        videoId: video.videoId,
        audioSizeBytes: saved.size,
      },
      transcriptId: transcript.id,
    });
  } catch (err) {
    if (req.file?.path) {
      await audioStorage.removeAudio(req.file.path).catch(() => {});
    }
    console.error('[helper] erro upload:', err);
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  listarVideosPendentes,
  listarChannelsComPendencias,
  uploadAudioHelper,
};
