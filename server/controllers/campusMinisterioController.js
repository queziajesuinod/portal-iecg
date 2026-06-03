const CampusMinisterioService = require('../services/campusMinisterioService');

class CampusMinisterioController {
  async listarMinisteriosPorCampus(req, res) {
    try {
      const data = await CampusMinisterioService.listarMinisteriosPorCampus(req.params.campusId);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async listarCampusPorMinisterio(req, res) {
    try {
      const data = await CampusMinisterioService.listarCampusPorMinisterio(req.params.ministerioId);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async listarVinculosPorCampus(req, res) {
    try {
      const data = await CampusMinisterioService.listarVinculosPorCampus(req.params.campusId);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async salvarVinculos(req, res) {
    try {
      const { ministerioIds } = req.body;
      if (!Array.isArray(ministerioIds)) {
        return res.status(400).json({ erro: 'ministerioIds deve ser um array' });
      }
      await CampusMinisterioService.salvarVinculos(req.params.campusId, ministerioIds);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async atualizarConfiguracao(req, res) {
    try {
      const { campusId, ministerioId } = req.params;
      const vinculo = await CampusMinisterioService.atualizarConfiguracao(campusId, ministerioId, req.body);
      return res.status(200).json(vinculo);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async buscarVinculo(req, res) {
    try {
      const { campusId, ministerioId } = req.params;
      const vinculo = await CampusMinisterioService.buscarVinculo(campusId, ministerioId);
      return res.status(200).json(vinculo);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }
}

module.exports = new CampusMinisterioController();
