const waitlistService = require('../services/waitlistService');

// ============ PUBLICO ============

// POST /api/public/events/:eventId/waitlist
async function entrar(req, res) {
  try {
    const { entry, position } = await waitlistService.entrarNaFila({
      ...req.body,
      eventId: req.params.eventId,
    });
    return res.status(201).json({
      sucesso: true,
      message: 'Voce entrou na lista de espera. Avisaremos quando abrir uma vaga.',
      position,
      entry: {
        id: entry.id,
        status: entry.status,
        batchId: entry.batchId,
        quantity: entry.quantity,
      },
    });
  } catch (err) {
    console.error('Erro ao entrar na lista de espera:', err.message);
    return res.status(400).json({ sucesso: false, message: err.message });
  }
}

// GET /api/public/events/:eventId/waitlist/position?email=&cpf=&batchId=
async function posicao(req, res) {
  try {
    const result = await waitlistService.consultarPosicaoPublica({
      eventId: req.params.eventId,
      batchId: req.query.batchId,
      email: req.query.email,
      cpf: req.query.cpf,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// ============ ADMIN ============

// GET /api/events/:eventId/waitlist
async function listar(req, res) {
  try {
    const entries = await waitlistService.listarPorEvento(req.params.eventId, {
      batchId: req.query.batchId,
    });
    return res.status(200).json(entries);
  } catch (err) {
    console.error('Erro ao listar lista de espera:', err.message);
    return res.status(500).json({ message: 'Erro ao listar lista de espera' });
  }
}

// GET /api/events/:eventId/waitlist/summary
async function resumo(req, res) {
  try {
    const data = await waitlistService.resumoPorEvento(req.params.eventId);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao resumir lista de espera' });
  }
}

// DELETE /api/events/waitlist/:id
async function remover(req, res) {
  try {
    const entry = await waitlistService.removerEntrada(req.params.id);
    return res.status(200).json({ sucesso: true, id: entry.id, status: entry.status });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// POST /api/events/waitlist/:id/offer
async function ofertar(req, res) {
  try {
    const { entry, registration } = await waitlistService.ofertarAgora(req.params.id);
    return res.status(200).json({
      sucesso: true,
      entry: { id: entry.id, status: entry.status, offerExpiresAt: entry.offerExpiresAt },
      registration: { id: registration.id, orderCode: registration.orderCode, paymentStatus: registration.paymentStatus },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// POST /api/events/waitlist/:id/resend
async function reenviar(req, res) {
  try {
    const result = await waitlistService.reenviarOferta(req.params.id);
    return res.status(200).json({ sucesso: true, result });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = {
  entrar,
  posicao,
  listar,
  resumo,
  remover,
  ofertar,
  reenviar,
};
