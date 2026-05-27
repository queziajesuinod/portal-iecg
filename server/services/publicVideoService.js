const { Op } = require('sequelize');
const { VideoTranscript, YoutubeVideo, YoutubeChannel } = require('../models');

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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
    seo: {
      metaTitle: transcript.seoMetaTitle || video?.title || null,
      metaDescription: transcript.seoMetaDescription,
      keywords: transcript.seoKeywords || [],
      slug: transcript.seoSlug,
    },
    ...(includeFullTranscript ? { transcript: transcript.transcript } : {}),
  };
}

async function listPublished({
  channelId, search, limit = 20, offset = 0, all = false
} = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const where = { published: true, status: 'done' };

  const videoWhere = {};
  if (search) {
    videoWhere.title = { [Op.iLike]: `%${search}%` };
  }
  if (channelId) {
    if (isUuid(channelId)) {
      videoWhere.youtubeChannelId = channelId;
    }
  }

  const channelWhere = {};
  if (channelId && !isUuid(channelId)) {
    channelWhere.channelId = channelId;
  }

  const query = {
    where,
    include: [
      {
        model: YoutubeVideo,
        as: 'video',
        required: true,
        ...(Object.keys(videoWhere).length ? { where: videoWhere } : {}),
        include: [
          {
            model: YoutubeChannel,
            as: 'channel',
            ...(Object.keys(channelWhere).length ? { where: channelWhere, required: true } : {}),
          },
        ],
      },
    ],
    order: [[{ model: YoutubeVideo, as: 'video' }, 'publishedAt', 'DESC']],
    distinct: true,
  };

  if (!all) {
    query.limit = safeLimit;
    query.offset = safeOffset;
  }

  const { rows, count } = await VideoTranscript.findAndCountAll(query);

  return {
    items: rows.map((r) => buildPublicVideoPayload(r, { includeFullTranscript: false })),
    total: count,
    limit: all ? count : safeLimit,
    offset: all ? 0 : safeOffset,
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

async function getBySlug(slug, { includeTranscript = true } = {}) {
  const transcript = await VideoTranscript.findOne({
    where: { published: true, status: 'done', seoSlug: slug },
    include: [
      {
        model: YoutubeVideo,
        as: 'video',
        required: true,
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
  getBySlug,
  listChannels,
  buildPublicVideoPayload,
};
