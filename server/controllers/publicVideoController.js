const publicVideoService = require('../services/publicVideoService');

async function listar(req, res) {
  try {
    const {
      channelId, search, limit, offset
    } = req.query;
    const result = await publicVideoService.listPublished({
      channelId, search, limit, offset
    });
    res.status(200).json(result);
  } catch (err) {
    console.error('[publicVideo] Erro ao listar:', err);
    res.status(500).json({ message: 'Erro ao listar videos publicos' });
  }
}

async function buscarPorVideoId(req, res) {
  try {
    const { videoId } = req.params;
    const includeTranscript = req.query.includeTranscript !== 'false';
    const video = await publicVideoService.getByVideoId(videoId, { includeTranscript });
    if (!video) return res.status(404).json({ message: 'Video nao encontrado ou nao publicado' });
    return res.status(200).json(video);
  } catch (err) {
    console.error('[publicVideo] Erro ao buscar:', err);
    return res.status(500).json({ message: 'Erro ao buscar video' });
  }
}

async function listarCanais(req, res) {
  try {
    const channels = await publicVideoService.listChannels();
    res.status(200).json(channels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  listar,
  buscarPorVideoId,
  listarCanais,
};
