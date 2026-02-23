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
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.perPage, 10) || 20, 1), 100);
    const offset = (page - 1) * perPage;
    const filters = {};
    ['orderCode', 'buyerName', 'buyerDocument', 'buyerData.buyer_name', 'buyerData.buyer_document', 'paymentStatus', 'dateFrom', 'dateTo', 'checkinStatus'].forEach((key) => {
      const value = req.query[key];
      if (value && value !== 'undefined') {
        filters[key] = value;
      }
    });
    const { rows, count } = await registrationService.listarInscricoesPorEvento(req.params.eventId, {
      limit: perPage,
      offset,
      filters
    });
    res.status(200).json({
      records: rows,
      total: count,
      page,
      perPage
    });
  } catch (err) {
    console.error('Erro ao listar inscrições do evento:', err);
    res.status(500).json({ message: 'Erro ao listar inscrições' });
  }
}

async function listarInscritosConfirmadosPorEvento(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.perPage, 10) || 20, 1), 100);
    const offset = (page - 1) * perPage;
    const filters = {};
    ['lote', 'orderCode', 'nomeCompleto'].forEach((key) => {
      const value = req.query[key];
      if (value && value !== 'undefined') {
        filters[key] = value;
      }
    });
    const { rows, count } = await registrationService.listarInscritosConfirmadosPorEvento(req.params.eventId, {
      limit: perPage,
      offset,
      filters
    });
    res.status(200).json({
      records: rows,
      total: count,
      page,
      perPage
    });
  } catch (err) {
    console.error('Erro ao listar inscritos confirmados do evento:', err);
    res.status(500).json({ message: 'Erro ao listar inscritos confirmados' });
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

    const paymentStatus = resultado.registration?.paymentStatus;
    const responseMessageByStatus = {
      confirmed: 'Inscrição realizada com pagamento confirmado.',
      pending: 'Inscrição realizada. Pagamento pendente.',
      authorized: 'Inscrição realizada. Pagamento autorizado.',
      denied: 'Pagamento negado. Inscrição registrada com status negado.',
      expired: 'Pagamento expirado. Inscrição registrada com status expirado.'
    };

    res.status(201).json({
      sucesso: true,
      pagamentoAprovado: paymentStatus === 'confirmed',
      orderCode: resultado.orderCode,
      message: responseMessageByStatus[paymentStatus] || `Inscrição registrada com status ${paymentStatus || 'pending'}.`,
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

async function recalcularStatus(req, res) {
  try {
    const registration = await registrationService.buscarInscricaoPorId(req.params.id);
    await registrationService.atualizarStatusPagamentoPorPagamentos(registration);
    res.status(200).json({
      message: 'Status recalculado com sucesso',
      paymentStatus: registration.paymentStatus
    });
  } catch (err) {
    console.error('Erro ao recalcular status da inscrição:', err);
    res.status(400).json({ message: err.message });
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
    const resultado = await registrationService.criarPagamentoOffline(req.params.id, userId, req.body || {});
    res.status(201).json(resultado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function atualizarPagamentoOffline(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const resultado = await registrationService.atualizarPagamentoOffline(
      req.params.id,
      req.params.paymentId,
      userId,
      req.body || {}
    );
    res.status(200).json(resultado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function removerPagamento(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id;
    await registrationService.removerPagamento(req.params.id, req.params.paymentId, userId);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function obterInfoCancelamento(req, res) {
  try {
    const info = await registrationService.obterInfoCancelamento(req.params.id);
    res.status(200).json(info);
  } catch (err) {
    console.error('Erro ao obter info de cancelamento:', err);
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listar,
  listarPorEvento,
  listarInscritosConfirmadosPorEvento,
  buscarPorId,
  cancelar,
  processar,
  buscarPorCodigo,
  verificarStatus,
  obterInfoCancelamento,
  recalcularStatus,
  criarPagamento,
  criarPagamentoOffline,
  atualizarPagamentoOffline,
  removerPagamento
};
