const publicVideoService = require('../services/publicVideoService');

async function listar(req, res) {
  try {
    const {
      channelId, search, category, speaker, limit, offset, all
    } = req.query;
    const result = await publicVideoService.listPublished({
      channelId,
      search,
      category,
      speaker,
      limit,
      offset,
      all: all === 'true'
    });
    res.status(200).json(result);
  } catch (err) {
    console.error('[publicVideo] Erro ao listar:', err);
    res.status(500).json({ message: 'Erro ao listar vídeos públicos' });
  }
}

async function listarCategorias(req, res) {
  try {
    const categories = await publicVideoService.listCategories();
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function listarSpeakers(req, res) {
  try {
    const speakers = await publicVideoService.listSpeakers();
    res.status(200).json(speakers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function buscarPorVideoId(req, res) {
  try {
    const { videoId } = req.params;
    const includeTranscript = req.query.includeTranscript !== 'false';
    const video = await publicVideoService.getByVideoId(videoId, { includeTranscript });
    if (!video) return res.status(404).json({ message: 'Vídeo não encontrado ou não publicado' });
    return res.status(200).json(video);
  } catch (err) {
    console.error('[publicVideo] Erro ao buscar:', err);
    return res.status(500).json({ message: 'Erro ao buscar vídeo' });
  }
}

async function buscarPorSlug(req, res) {
  try {
    const { slug } = req.params;
    const includeTranscript = req.query.includeTranscript !== 'false';
    const video = await publicVideoService.getBySlug(slug, { includeTranscript });
    if (!video) return res.status(404).json({ message: 'Vídeo não encontrado ou não publicado' });
    return res.status(200).json(video);
  } catch (err) {
    console.error('[publicVideo] Erro ao buscar por slug:', err);
    return res.status(500).json({ message: 'Erro ao buscar vídeo' });
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
  buscarPorSlug,
  listarCanais,
  listarCategorias,
  listarSpeakers,
};
