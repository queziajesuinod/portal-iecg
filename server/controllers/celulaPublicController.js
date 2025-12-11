const CelulaPublicService = require('../services/celulaPublicService');

class CelulaPublicController {
  async buscarPorContato(req, res) {
    try {
      const { contato } = req.query;
      const celula = await CelulaPublicService.buscarPorContato(contato);
      return res.status(200).json(celula);
    } catch (error) {
      const status = error.message.includes('encontrada') || error.message.includes('nao encontrada') ? 404 : 400;
      return res.status(status).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const celula = await CelulaPublicService.atualizar(id, req.body);
      return res.status(200).json(celula);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new CelulaPublicController();
