const depositRequestService = require('../services/depositRequestService');

function getUserId(req) {
  return req.user?.userId || req.user?.id || null;
}

// ============ PUBLICO ============

// POST /api/public/events/:eventId/deposit-request
async function solicitar(req, res) {
  try {
    const clientMeta = {
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    };
    const { registration, requestedDepositAmount } = await depositRequestService.solicitar({
      ...req.body,
      eventId: req.params.eventId,
      clientMeta,
    });
    return res.status(201).json({
      sucesso: true,
      message: 'Solicitacao enviada. Avisaremos quando for avaliada.',
      orderCode: registration.orderCode,
      requestedDepositAmount,
      registration: {
        id: registration.id,
        orderCode: registration.orderCode,
        paymentStatus: registration.paymentStatus,
        depositApprovalStatus: registration.depositApprovalStatus,
      },
    });
  } catch (err) {
    console.error('Erro na solicitacao de entrada:', err.message);
    return res.status(400).json({ sucesso: false, message: err.message });
  }
}

// ============ ADMIN ============

// GET /api/events/:eventId/deposit-requests
async function listar(req, res) {
  try {
    const data = await depositRequestService.listarPorEvento(req.params.eventId, { status: req.query.status });
    return res.status(200).json(data);
  } catch (err) {
    console.error('Erro ao listar solicitacoes de entrada:', err.message);
    return res.status(500).json({ message: 'Erro ao listar solicitacoes de entrada' });
  }
}

// GET /api/events/:eventId/deposit-requests/summary
async function resumo(req, res) {
  try {
    const data = await depositRequestService.resumoPorEvento(req.params.eventId);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao resumir solicitacoes de entrada' });
  }
}

// POST /api/events/deposit-requests/:id/approve  (body: { approvedAmount? })
async function aprovar(req, res) {
  try {
    const registration = await depositRequestService.aprovar(req.params.id, {
      approvedAmount: req.body?.approvedAmount,
      userId: getUserId(req),
    });
    return res.status(200).json({
      sucesso: true,
      id: registration.id,
      orderCode: registration.orderCode,
      approvedDepositAmount: registration.approvedDepositAmount,
      depositOfferExpiresAt: registration.depositOfferExpiresAt,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// POST /api/events/deposit-requests/:id/reject
async function recusar(req, res) {
  try {
    const registration = await depositRequestService.recusar(req.params.id, { userId: getUserId(req) });
    return res.status(200).json({ sucesso: true, id: registration.id, status: registration.depositApprovalStatus });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = {
  solicitar,
  listar,
  resumo,
  aprovar,
  recusar,
};
