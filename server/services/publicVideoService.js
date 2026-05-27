const { Op } = require('sequelize');
const { VideoTranscript, YoutubeVideo, YoutubeChannel } = require('../models');

function buildPublicVideoPayload(transcript, { includeFullTranscript = false } = {}) {
  const { video } = transcript;
  const channel = video?.channel;

  return {
    id: transcript.id,
    videoId: video?.videoId,
    youtubeUrl: video?.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : null,
    title: video?.title,
    description: video?.description,
    thumbnailUrl: video?.thumbnailUrl,
    publishedAt: video?.publishedAt,
    durationSeconds: video?.durationSeconds,
    channel: channel
      ? {
        channelId: channel.channelId,
        channelName: channel.channelName,
        ownerName: channel.ownerName,
        channelThumbnailUrl: channel.channelThumbnailUrl,
      }
      : null,
    summary: transcript.summary,
    bulletPoints: transcript.bulletPoints || [],
    language: transcript.language,
    source: transcript.source,
    processedAt: transcript.processedAt,
    ...(includeFullTranscript ? { transcript: transcript.transcript } : {}),
  };
}

async function listPublished({
  channelId, search, limit = 20, offset = 0
} = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const where = { published: true, status: 'done' };

  const videoWhere = {};
  if (search) {
    videoWhere.title = { [Op.iLike]: `%${search}%` };
  }
  if (channelId) {
    videoWhere.youtubeChannelId = channelId;
  }

  const { rows, count } = await VideoTranscript.findAndCountAll({
    where,
    include: [
      {
        model: YoutubeVideo,
        as: 'video',
        required: true,
        ...(Object.keys(videoWhere).length ? { where: videoWhere } : {}),
        include: [{ model: YoutubeChannel, as: 'channel' }],
      },
    ],
    order: [[{ model: YoutubeVideo, as: 'video' }, 'publishedAt', 'DESC']],
    limit: safeLimit,
    offset: safeOffset,
    distinct: true,
  });

  return {
    items: rows.map((r) => buildPublicVideoPayload(r, { includeFullTranscript: false })),
    total: count,
    limit: safeLimit,
    offset: safeOffset,
  };
}

async function getByVideoId(videoId, { includeTranscript = true } = {}) {
  const transcript = await VideoTranscript.findOne({
    where: { published: true, status: 'done' },
    include: [
      {
        model: YoutubeVideo,
        as: 'video',
        required: true,
        where: { videoId },
        include: [{ model: YoutubeChannel, as: 'channel' }],
      },
    ],
  });

  if (!transcript) return null;
  return buildPublicVideoPayload(transcript, { includeFullTranscript: includeTranscript });
}

async function listChannels() {
  const channels = await YoutubeChannel.findAll({
    where: { active: true },
    attributes: ['channelId', 'channelName', 'ownerName', 'channelThumbnailUrl'],
    order: [['channelName', 'ASC']],
  });
  return channels;
}

module.exports = {
  listPublished,
  getByVideoId,
  listChannels,
  buildPublicVideoPayload,
};
