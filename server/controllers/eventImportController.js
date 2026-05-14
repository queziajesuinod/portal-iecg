const eventImportService = require('../services/eventImportService');

async function setup(req, res) {
  try {
    const { eventId } = req.params;
    const data = await eventImportService.getSetup(eventId);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(err.message.includes('não encontrado') ? 404 : 500).json({ erro: err.message });
  }
}

async function preview(req, res) {
  try {
    const { eventId } = req.params;
    const { fieldMapping = {}, buyerFieldMapping = {} } = req.body;
    const result = await eventImportService.previewImport(eventId, fieldMapping, buyerFieldMapping);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

async function execute(req, res) {
  try {
    const { eventId } = req.params;
    const { fieldMapping = {}, buyerFieldMapping = {}, memberStatus = 'MEMBRO' } = req.body;
    if (!Object.values(fieldMapping).includes('fullName') && !Object.values(buyerFieldMapping).includes('fullName')) {
      return res.status(400).json({ erro: 'Mapeie ao menos o campo Nome completo (fullName)' });
    }
    const stats = await eventImportService.executeImport(eventId, fieldMapping, buyerFieldMapping, memberStatus);
    return res.status(200).json(stats);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

module.exports = { setup, preview, execute };
