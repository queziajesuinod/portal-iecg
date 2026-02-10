const CelulaLeaderService = require('../services/celulaLeaderService');

class CelulaLeaderPublicController {
  async upsertLeader(req, res) {
    try {
      const payload = req.body;
      const result = await CelulaLeaderService.upsertLeaderForCelula(payload);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro público ao salvar líder de célula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async linkSpouse(req, res) {
    try {
      const payload = req.body;
      const result = await CelulaLeaderService.linkSpouseByContact(payload);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro público ao vincular cônjuge:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async unlinkSpouse(req, res) {
    try {
      const payload = req.body;
      const result = await CelulaLeaderService.unlinkSpouseByLeaderId(payload);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro público ao desvincular cônjuge:', error);
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new CelulaLeaderPublicController();
