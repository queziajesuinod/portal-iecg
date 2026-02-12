const CelulaLeaderService = require('../services/celulaLeaderService');

class CelulaLeaderController {
  async upsertLeader(req, res) {
    try {
      const payload = req.body;
      const result = await CelulaLeaderService.upsertLeaderForCelula(payload);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao salvar líder de célula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async linkSpouse(req, res) {
    try {
      const payload = req.body;
      const result = await CelulaLeaderService.linkSpouseByContact(payload);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao vincular cônjuge:', error);
      return res.status(400).json({ erro: error.message });
    }
  }


  async migrateLeaders(req, res) {
    try {
      const migrated = await CelulaLeaderService.migrateCelulaLeaders();
      return res.status(200).json({
        migrated,
        total: migrated.length,
        mensagem: `Sincroniza??o conclu?da. ${migrated.length} l?deres vinculados.`
      });
    } catch (error) {
      console.error('Erro ao migrar l?deres de c?lula:', error);
      return res.status(500).json({ erro: error.message });
    }
  }
}

module.exports = new CelulaLeaderController();
