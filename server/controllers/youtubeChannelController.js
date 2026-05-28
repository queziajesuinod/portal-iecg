const { YoutubeChannel } = require('../models');
const youtubeOAuth = require('../services/youtubeOAuthService');

async function listar(req, res) {
  try {
    const channels = await YoutubeChannel.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(channels);
  } catch (err) {
    console.error('[youtubeChannel] Erro ao listar canais:', err);
    res.status(500).json({ message: 'Erro ao listar canais' });
  }
}

async function buscarPorId(req, res) {
  try {
    const channel = await YoutubeChannel.findByPk(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Canal não encontrado' });
    return res.status(200).json(channel);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const channel = await YoutubeChannel.findByPk(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Canal não encontrado' });

    const allowed = {};
    if (typeof req.body.ownerName === 'string') allowed.ownerName = req.body.ownerName;
    if (typeof req.body.active === 'boolean') allowed.active = req.body.active;

    await channel.update(allowed);
    return res.status(200).json(channel);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function remover(req, res) {
  try {
    const channel = await YoutubeChannel.findByPk(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Canal não encontrado' });
    await channel.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function iniciarOAuth(req, res) {
  try {
    const channelId = req.body.channelId || null;
    let ownerName = (req.body.ownerName || '').trim();

    if (channelId) {
      const existing = await YoutubeChannel.findByPk(channelId);
      if (!existing) return res.status(404).json({ message: 'Canal não encontrado' });
      ownerName = ownerName || existing.ownerName;
    }

    if (!ownerName) {
      return res.status(400).json({ message: 'ownerName e obrigatorio' });
    }

    const adminUserId = req.user?.id || null;
    const { url } = youtubeOAuth.buildAuthUrl({ ownerName, adminUserId });
    return res.status(200).json({ url });
  } catch (err) {
    console.error('[youtubeChannel] Erro ao iniciar OAuth:', err);
    return res.status(500).json({ message: err.message });
  }
}

async function oauthCallback(req, res) {
  const { code, state, error } = req.query;
  const successRedirect = process.env.FRONTEND_URL || '';

  if (error) {
    console.warn('[youtubeChannel] OAuth retornou erro:', error);
    return res.redirect(`${successRedirect}/app/admin/videos/canais?oauth=error&reason=${encodeURIComponent(error)}`);
  }

  try {
    if (!code) throw new Error('code ausente no callback');
    const payload = youtubeOAuth.verifyState(state);

    const tokens = await youtubeOAuth.exchangeCodeForTokens(code);
    const channelInfo = await youtubeOAuth.fetchOwnedChannel(tokens);

    const existing = await YoutubeChannel.scope('withTokens').findOne({
      where: { channelId: channelInfo.channelId },
    });

    if (existing) {
      existing.ownerName = payload.ownerName || existing.ownerName;
      existing.channelName = channelInfo.channelName;
      existing.channelThumbnailUrl = channelInfo.channelThumbnailUrl;
      existing.uploadsPlaylistId = channelInfo.uploadsPlaylistId;
      existing.oauthScopes = tokens.scope ? tokens.scope.split(' ') : existing.oauthScopes;
      existing.active = true;
      existing.setRefreshToken(tokens.refresh_token);
      existing.setAccessToken(tokens.access_token, tokens.expiry_date ? new Date(tokens.expiry_date) : null);
      await existing.save();
    } else {
      const channel = YoutubeChannel.build({
        ownerName: payload.ownerName,
        channelId: channelInfo.channelId,
        channelName: channelInfo.channelName,
        channelThumbnailUrl: channelInfo.channelThumbnailUrl,
        uploadsPlaylistId: channelInfo.uploadsPlaylistId,
        oauthScopes: tokens.scope ? tokens.scope.split(' ') : [],
        active: true,
      });
      channel.setRefreshToken(tokens.refresh_token);
      channel.setAccessToken(tokens.access_token, tokens.expiry_date ? new Date(tokens.expiry_date) : null);
      await channel.save();
    }

    return res.redirect(`${successRedirect}/app/admin/videos/canais?oauth=success`);
  } catch (err) {
    console.error('[youtubeChannel] Erro no callback OAuth:', err);
    return res.redirect(
      `${successRedirect}/app/admin/videos/canais?oauth=error&reason=${encodeURIComponent(err.message)}`
    );
  }
}

module.exports = {
  listar,
  buscarPorId,
  atualizar,
  remover,
  iniciarOAuth,
  oauthCallback,
};
