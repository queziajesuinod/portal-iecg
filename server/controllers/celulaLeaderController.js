const CelulaLeaderService = require('../services/celulaLeaderService');

class CelulaLeaderController {
  async upsertLeader(req, res) {
    try {
      const payload = req.body;
      const result = await CelulaLeaderService.upsertLeaderForCelula(payload);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao salvar l�der de c�lula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async linkSpouse(req, res) {
    try {
      const payload = req.body;
      const result = await CelulaLeaderService.linkSpouseByContact(payload);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao vincular c�njuge:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async migrateLeaders(req, res) {
    try {
      const { migrated, errors } = await CelulaLeaderService.migrateCelulaLeaders();
      return res.status(200).json({
        migrated,
        errors,
        total: migrated.length,
        totalErros: errors.length,
        mensagem: `Sincronização concluída. ${migrated.length} líderes vinculados, ${errors.length} ignorados por erro.`
      });
    } catch (error) {
      console.error('Erro ao migrar líderes de célula:', error);
      return res.status(500).json({ erro: error.message });
    }
  }
}

module.exports = new CelulaLeaderController();
