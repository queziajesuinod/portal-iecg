const registrationService = require('../services/registrationService');

// Rotas administrativas
async function listar(req, res) {
  try {
    const inscricoes = await registrationService.listarInscricoes();
    res.status(200).json(inscricoes);
  } catch (err) {
    console.error('Erro ao listar inscrições:', err);
    res.status(500).json({ message: 'Erro ao listar inscrições' });
  }
}

async function listarPorEvento(req, res) {
  try {
    const inscricoes = await registrationService.listarInscricoesPorEvento(req.params.eventId);
    res.status(200).json(inscricoes);
  } catch (err) {
    console.error('Erro ao listar inscrições do evento:', err);
    res.status(500).json({ message: 'Erro ao listar inscrições' });
  }
}

async function buscarPorId(req, res) {
  try {
    const inscricao = await registrationService.buscarInscricaoPorId(req.params.id);
    res.status(200).json(inscricao);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

async function cancelar(req, res) {
  try {
    const inscricao = await registrationService.cancelarInscricao(req.params.id);
    res.status(200).json(inscricao);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// Rotas públicas
async function processar(req, res) {
  try {
    const resultado = await registrationService.processarInscricao(req.body);

    // Enviar notificação ao administrador (implementar depois)
    // await notificarAdmin(resultado);

    const attendees = resultado.attendees?.map(attendee => ({
      id: attendee.id,
      attendeeNumber: attendee.attendeeNumber,
      batchId: attendee.batchId,
      batch: attendee.batch ? {
        id: attendee.batch.id,
        name: attendee.batch.name,
        price: attendee.batch.price
      } : null,
      attendeeData: attendee.attendeeData
    })) ?? [];

    res.status(201).json({
      sucesso: true,
      orderCode: resultado.orderCode,
      message: 'Inscrição realizada com sucesso!',
      registration: {
        id: resultado.registration.id,
        orderCode: resultado.orderCode,
        quantity: resultado.registration.quantity,
        finalPrice: resultado.registration.finalPrice,
        paymentStatus: resultado.registration.paymentStatus,
        attendees
      },
      pagamento: resultado.pagamento
    });
  } catch (err) {
    console.error('Erro ao processar inscrição:', err);
    res.status(400).json({
      sucesso: false,
      message: err.message
    });
  }
}

async function buscarPorCodigo(req, res) {
  try {
    const inscricao = await registrationService.buscarInscricaoPorCodigo(req.params.orderCode);
    res.status(200).json(inscricao);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

async function verificarStatus(req, res) {
  try {
    const { orderCode } = req.params;
    const inscricao = await registrationService.buscarInscricaoPorCodigo(orderCode);
    const status = inscricao.paymentStatusDerived || inscricao.paymentStatus;

    res.status(200).json({
      orderCode: inscricao.orderCode,
      paymentStatus: status,
      paymentMethod: inscricao.paymentMethod,
      isPaid: status === 'confirmed'
    });
  } catch (err) {
    res.status(404).json({ message: 'Inscrição não encontrada' });
  }
}

async function criarPagamento(req, res) {
  try {
    const resultado = await registrationService.criarPagamentoOnline(req.params.id, req.body || {});
    res.status(201).json(resultado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function criarPagamentoOffline(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const resultado = await registrationService.criarPagamentoOffline(req.params.id, req.body || {}, userId);
    res.status(201).json(resultado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listar,
  listarPorEvento,
  buscarPorId,
  cancelar,
  processar,
  buscarPorCodigo,
  verificarStatus,
  criarPagamento,
  criarPagamentoOffline
};
