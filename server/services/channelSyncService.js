const { YoutubeChannel, YoutubeVideo } = require('../models');
const youtubeApi = require('./youtubeApiService');

async function syncSingleChannel(channel, { maxPages = 5 } = {}) {
  if (!channel.getRefreshToken()) {
    throw new Error('Canal sem refresh_token. Refaça a autorização OAuth.');
  }

  const result = await youtubeApi.syncChannelVideos(channel, { maxPages });

  let created = 0;
  let updated = 0;

  for (const video of result.items) {
    const existing = await YoutubeVideo.findOne({ where: { videoId: video.videoId } });
    if (existing) {
      const updatePayload = { ...video };
      if (existing.ignored) {
        delete updatePayload.ignored;
        delete updatePayload.ignoreReason;
      }
      await existing.update(updatePayload);
      updated += 1;
    } else {
      await YoutubeVideo.create({ ...video, youtubeChannelId: channel.id });
      created += 1;
    }
  }

  channel.lastSyncedAt = new Date();
  await channel.save();

  return {
    created,
    updated,
    total: result.items.length,
    skippedByPrivacy: result.skippedByPrivacy,
    skippedByDuration: result.skippedByDuration,
    filters: result.filters,
  };
}

async function syncAllActiveChannels({ maxPages = 5 } = {}) {
  const channels = await YoutubeChannel.scope('withTokens').findAll({
    where: { active: true },
  });

  const results = [];
  for (const channel of channels) {
    try {
      const stats = await syncSingleChannel(channel, { maxPages });
      results.push({
        channelId: channel.id,
        channelName: channel.channelName,
        success: true,
        ...stats,
      });
    } catch (err) {
      results.push({
        channelId: channel.id,
        channelName: channel.channelName,
        success: false,
        error: err.message,
      });
    }
  }
  return results;
}

module.exports = { syncSingleChannel, syncAllActiveChannels };
