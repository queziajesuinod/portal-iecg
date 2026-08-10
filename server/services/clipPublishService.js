const fs = require('fs');
const { VideoClip, YoutubeVideo, YoutubeChannel } = require('../models');
const youtubeApi = require('./youtubeApiService');

// Monta titulo/descricao do Short, garantindo a hashtag #Shorts.
function buildShortMeta(clip, video, overrides = {}) {
  let title = (overrides.title || clip.title || video.title || 'Short').trim();
  if (!/#shorts/i.test(title)) {
    const suffix = ' #Shorts';
    title = (title.slice(0, 100 - suffix.length)).trim() + suffix;
  }
  const descParts = [];
  if (overrides.description) descParts.push(overrides.description.trim());
  else if (clip.caption) descParts.push(clip.caption.trim());
  descParts.push(`Trecho de: ${video.title}`);
  descParts.push('https://www.youtube.com/watch?v=' + video.videoId);
  descParts.push('#Shorts');
  const description = descParts.join('\n\n');

  return { title, description, privacyStatus: overrides.privacyStatus };
}

/**
 * Publica um recorte ja renderizado como Short no YouTube.
 * Fluxo de status: rendered -> publishing -> published (ou de volta a rendered em falha).
 */
async function publishClip(clipId, overrides = {}) {
  const clip = await VideoClip.findByPk(clipId, {
    include: [{ model: YoutubeVideo, as: 'video' }],
  });
  if (!clip) throw new Error('Recorte nao encontrado');
  if (clip.status === 'publishing') throw new Error('Recorte ja esta publicando');
  if (clip.status === 'published') throw new Error('Recorte ja foi publicado');
  if (!clip.filePath || !fs.existsSync(clip.filePath)) {
    throw new Error('Arquivo do recorte nao encontrado. Renderize antes de publicar.');
  }

  const { video } = clip;
  // Canal precisa dos tokens (defaultScope os exclui).
  const channel = await YoutubeChannel.scope('withTokens').findByPk(video.youtubeChannelId);
  if (!channel) throw new Error('Canal do video nao encontrado');
  if (!channel.getRefreshToken()) {
    throw new Error('Canal sem autorizacao OAuth. Reconecte o canal para publicar.');
  }

  const meta = buildShortMeta(clip, video, overrides);

  await clip.update({ status: 'publishing', errorMessage: null });
  try {
    const data = await youtubeApi.publishShort(channel, clip.filePath, meta);
    await clip.update({
      status: 'published',
      youtubeShortId: data.id || null,
      publishedAt: new Date(),
      errorMessage: null,
    });
    console.log(`[clipPublish] recorte ${clip.id} publicado como Short ${data.id}`);
    return { clip, youtubeShortId: data.id, url: data.id ? `https://youtube.com/shorts/${data.id}` : null };
  } catch (err) {
    // Volta para 'rendered' para permitir nova tentativa (o arquivo continua valido).
    await clip.update({ status: 'rendered', errorMessage: err.message }).catch(() => {});
    console.error(`[clipPublish] falha ao publicar recorte ${clip.id}:`, err.message);
    throw err;
  }
}

/**
 * Exclui a publicacao de um recorte: APAGA o Short do YouTube (videos.delete) e
 * volta o recorte para um estado re-renderizavel/republicavel. Use para refazer
 * um clip antigo com o novo rastreamento (anti-tremor).
 * Fluxo de status: published -> rendered (se o arquivo ainda existe) ou approved
 * (se ja foi limpo do disco e precisa re-render).
 */
async function unpublishClip(clipId) {
  const clip = await VideoClip.findByPk(clipId, {
    include: [{ model: YoutubeVideo, as: 'video' }],
  });
  if (!clip) throw new Error('Recorte nao encontrado');
  if (clip.status !== 'published') {
    throw new Error(`Recorte precisa estar 'published' para excluir a publicacao (atual: ${clip.status})`);
  }

  const { video } = clip;
  if (clip.youtubeShortId) {
    const channel = await YoutubeChannel.scope('withTokens').findByPk(video.youtubeChannelId);
    if (!channel) throw new Error('Canal do video nao encontrado');
    if (!channel.getRefreshToken()) {
      throw new Error('Canal sem autorizacao OAuth. Reconecte o canal para excluir a publicacao.');
    }
    const result = await youtubeApi.deleteVideo(channel, clip.youtubeShortId);
    if (result.missing) {
      console.warn(`[clipPublish] Short ${clip.youtubeShortId} ja nao existe no YouTube; desmarcando localmente`);
    } else {
      console.log(`[clipPublish] Short ${clip.youtubeShortId} apagado do YouTube (recorte ${clip.id})`);
    }
  }

  // Se o arquivo renderizado ainda esta em disco, volta para 'rendered' (republica direto);
  // se ja foi limpo, volta para 'approved' (precisa re-renderizar).
  const hasFile = Boolean(clip.filePath) && fs.existsSync(clip.filePath);
  const updates = {
    status: hasFile ? 'rendered' : 'approved',
    youtubeShortId: null,
    publishedAt: null,
    errorMessage: null,
  };
  if (!hasFile) {
    updates.filePath = null;
    updates.fileSizeBytes = null;
  }
  await clip.update(updates);
  return clip;
}

module.exports = {
  publishClip,
  unpublishClip,
};
