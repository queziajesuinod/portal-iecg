const liabilityTermService = require('../services/liabilityTermService');
const liabilityTermPdfService = require('../services/liabilityTermPdfService');
const eventService = require('../services/eventService');

function getUserId(req) {
  return req.user?.userId || req.user?.id || null;
}

// GET /:eventId/liability-term (admin) — config + catalogo dinamico de placeholders
// (campos do inscrito + placeholders de sistema).
async function obterConfig(req, res) {
  try {
    const [term, catalog] = await Promise.all([
      liabilityTermService.getConfigByEvent(req.params.eventId),
      liabilityTermService.getPlaceholderCatalog(req.params.eventId),
    ]);
    res.status(200).json({
      term,
      systemPlaceholders: catalog.systemPlaceholders,
      standardPlaceholders: catalog.standardPlaceholders,
      attendeeFields: catalog.attendeeFields,
      pageBreakToken: catalog.pageBreakToken,
    });
  } catch (err) {
    console.error('Erro ao obter termo do evento:', err);
    res.status(500).json({ message: 'Erro ao obter termo de responsabilidade' });
  }
}

// PUT /:eventId/liability-term (admin) — cria/atualiza config + flag do evento.
async function salvarConfig(req, res) {
  try {
    const result = await liabilityTermService.upsertConfig(
      req.params.eventId,
      req.body,
      getUserId(req)
    );
    // Invalida o cache do evento publico para o app de check-in ver a mudanca.
    if (typeof eventService.invalidateEventPublicCache === 'function') {
      await eventService.invalidateEventPublicCache(req.params.eventId);
    }
    res.status(200).json(result);
  } catch (err) {
    console.error('Erro ao salvar termo do evento:', err);
    res.status(400).json({ message: err.message || 'Erro ao salvar termo de responsabilidade' });
  }
}

// GET /:eventId/liability-term/acceptances (admin) — auditoria de assinaturas.
async function listarAceites(req, res) {
  try {
    const aceites = await liabilityTermService.listAcceptances(req.params.eventId);
    res.status(200).json(aceites);
  } catch (err) {
    console.error('Erro ao listar aceites do termo:', err);
    res.status(500).json({ message: 'Erro ao listar aceites do termo' });
  }
}

// GET /registrations/:orderCode/term-pdf (público) — PDF do termo assinado (regenerado sob demanda).
async function downloadPdf(req, res) {
  try {
    const reg = await liabilityTermPdfService.findRegistrationByOrderCode(req.params.orderCode);
    if (!reg) return res.status(404).json({ message: 'Inscrição não encontrada' });
    const pdf = await liabilityTermPdfService.generateForRegistration(reg.id);
    if (!pdf) return res.status(404).json({ message: 'Esta inscrição não possui termo assinado' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="termo-${reg.orderCode}.pdf"`);
    return res.send(pdf);
  } catch (err) {
    console.error('Erro ao gerar PDF do termo:', err);
    return res.status(500).json({ message: err.message || 'Erro ao gerar PDF do termo' });
  }
}

module.exports = {
  obterConfig,
  salvarConfig,
  listarAceites,
  downloadPdf,
};
