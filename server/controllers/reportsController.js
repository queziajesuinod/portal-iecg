const reportsService = require('../services/reportsService');

async function membros(req, res) {
  try {
    const data = await reportsService.membros({
      campusId: req.query.campusId,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });
    res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao gerar relatório de membros:', error);
    res.status(500).json({ message: error.message || 'Erro ao gerar relatório de membros' });
  }
}

async function eventosFinanceiro(req, res) {
  try {
    const data = await reportsService.eventosFinanceiro({
      eventId: req.query.eventId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });
    res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao gerar relatório de eventos/finanças:', error);
    res.status(500).json({ message: error.message || 'Erro ao gerar relatório de eventos e finanças' });
  }
}

async function cultos(req, res) {
  try {
    const data = await reportsService.cultos({
      campusId: req.query.campusId,
      ministerioId: req.query.ministerioId,
      tipoEventoId: req.query.tipoEventoId,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
    });
    res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao gerar relatório de cultos:', error);
    res.status(500).json({ message: error.message || 'Erro ao gerar relatório de cultos' });
  }
}

module.exports = {
  membros,
  eventosFinanceiro,
  cultos,
};
