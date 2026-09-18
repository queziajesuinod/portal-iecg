/**
 * Solicitacao de entrada abaixo do sinal minimo (pre-aprovacao) — eventos BALANCE_DUE.
 *
 * Fluxo:
 *  1. Pessoa nao tem o sinal minimo -> solicita entrar com o valor que consegue (solicitar).
 *     Cria inscricao PENDING sem cobrar (reserva a vaga) com status 'requested'.
 *  2. Admin avalia -> aprovar (pode ajustar o valor) ou recusar.
 *     Aprovado: grava approvedDepositAmount + prazo (depositOfferExpiresAt) e notifica com link.
 *  3. Pessoa paga o valor aprovado -> vira 'partial' (garantida). Saldo depois, normal.
 *  4. Nao pagou no prazo -> expira -> cancela inscricao (libera a vaga).
 *
 * A regra de "minimo" no pagamento passa a usar approvedDepositAmount daquela inscricao
 * (ver registrationService.criarPagamentoOnline).
 */
const { Op } = require('sequelize');
const {
  Registration, RegistrationPayment, Event
} = require('../models');
const registrationService = require('./registrationService');

function toMoney(v) {
  const n = Number(v) || 0;
  return Number(n.toFixed(2));
}

async function paidTotal(registrationId) {
  const rows = await RegistrationPayment.findAll({
    where: { registrationId, status: 'confirmed' },
    attributes: ['amount'],
    raw: true,
  });
  return toMoney(rows.reduce((s, p) => s + (Number(p.amount) || 0), 0));
}

/**
 * Cria a solicitacao: inscricao PENDING sem cobranca (reserva a vaga) + status 'requested'.
 * @param {object} dados - { eventId, buyerData, attendeesData, couponCode?, termAcceptances?, requestedDepositAmount }
 */
async function solicitar(dados = {}) {
  const { eventId, requestedDepositAmount } = dados;
  if (!eventId) throw new Error('eventId e obrigatorio');

  const event = await Event.findByPk(eventId);
  if (!event) throw new Error('Evento nao encontrado');
  if (event.requiresPayment === false) throw new Error('Evento gratuito nao usa sinal');
  if (event.registrationPaymentMode !== 'BALANCE_DUE') {
    throw new Error('Solicitacao de entrada so vale para eventos com pagamento parcelado');
  }
  if (!event.allowBelowMinimumDeposit) {
    throw new Error('Este evento nao permite entrada abaixo do minimo');
  }
  const minDeposit = Number(event.minDepositAmount || 0);
  if (!minDeposit) {
    throw new Error('Evento sem sinal minimo definido');
  }

  const pedido = toMoney(requestedDepositAmount);
  if (pedido <= 0) throw new Error('Informe o valor de entrada que voce consegue pagar');
  if (pedido >= minDeposit) {
    throw new Error(`Esse valor ja atinge o sinal minimo (R$ ${minDeposit.toFixed(2).replace('.', ',')}). Faca a inscricao normalmente.`);
  }

  // Materializa a inscricao PENDING sem cobrar (mesmo caminho da lista de espera).
  const resultado = await registrationService.processarInscricao({
    eventId,
    couponCode: dados.couponCode || null,
    quantity: (dados.attendeesData || []).length || dados.quantity || 1,
    buyerData: dados.buyerData,
    attendeesData: dados.attendeesData,
    termAcceptances: dados.termAcceptances || null,
    clientMeta: dados.clientMeta || null,
    origemListaEspera: true, // pula dedupe PIX
    criarPendenteSemPagamento: true,
  });

  const registration = resultado?.registration;
  if (!registration) throw new Error('Falha ao criar a inscricao da solicitacao');

  if (pedido >= Number(registration.finalPrice || 0)) {
    // entrada >= total nao faz sentido; deixa a inscricao mas registra o pedido igual ao total
  }

  await registration.update({
    depositApprovalStatus: 'requested',
    requestedDepositAmount: pedido,
    approvedDepositAmount: null,
    depositApprovedBy: null,
    depositApprovedAt: null,
    depositOfferExpiresAt: null,
  });

  // Notifica que a solicitacao foi recebida (best-effort).
  setImmediate(() => {
    require('./depositRequestNotificationService').notifyRequested(registration)
      .catch((err) => console.error('[deposit] notifyRequested falhou:', err.message));
  });

  return { registration, requestedDepositAmount: pedido };
}

/**
 * Aprova a solicitacao. O admin pode ajustar o valor (approvedAmount).
 */
async function aprovar(registrationId, { approvedAmount, userId } = {}) {
  const registration = await Registration.findByPk(registrationId, {
    include: [{ model: Event, as: 'event' }],
  });
  if (!registration) throw new Error('Inscricao nao encontrada');
  if (registration.depositApprovalStatus !== 'requested') {
    throw new Error(`So e possivel aprovar solicitacoes pendentes (status atual: ${registration.depositApprovalStatus})`);
  }

  const finalPrice = Number(registration.finalPrice || 0);
  const valor = toMoney(approvedAmount != null ? approvedAmount : registration.requestedDepositAmount);
  if (valor <= 0) throw new Error('Valor aprovado deve ser maior que zero');
  if (valor > finalPrice) throw new Error('Valor aprovado nao pode ser maior que o total da inscricao');

  const ttlHours = Number(registration.event?.belowMinDepositTtlHours) > 0
    ? Number(registration.event.belowMinDepositTtlHours)
    : 24;
  const now = new Date();

  await registration.update({
    depositApprovalStatus: 'approved',
    approvedDepositAmount: valor,
    depositApprovedBy: userId || null,
    depositApprovedAt: now,
    depositOfferExpiresAt: new Date(now.getTime() + ttlHours * 3600 * 1000),
  });

  setImmediate(() => {
    require('./depositRequestNotificationService').notifyApproved(registration)
      .catch((err) => console.error('[deposit] notifyApproved falhou:', err.message));
  });

  return registration;
}

/**
 * Recusa a solicitacao (ou cancela uma aprovada ainda nao paga): cancela a inscricao (libera vaga).
 */
async function recusar(registrationId, { userId } = {}) {
  const registration = await Registration.findByPk(registrationId);
  if (!registration) throw new Error('Inscricao nao encontrada');
  if (!['requested', 'approved'].includes(registration.depositApprovalStatus)) {
    throw new Error('So e possivel recusar solicitacoes pendentes ou aprovadas nao pagas');
  }
  // Se ja pagou (partial/confirmed), nao recusa.
  if (['partial', 'confirmed'].includes(registration.paymentStatus)) {
    throw new Error('Inscricao ja possui pagamento — nao e possivel recusar');
  }

  // Cancela a inscricao pending (libera a vaga).
  if (!['cancelled', 'refunded'].includes(registration.paymentStatus)) {
    await registrationService.cancelarInscricao(registration.id).catch((err) => {
      console.error('[deposit] cancelar inscricao ao recusar falhou:', err.message);
    });
  }
  await registration.update({
    depositApprovalStatus: 'rejected',
    depositApprovedBy: userId || null,
    depositApprovedAt: new Date(),
    depositOfferExpiresAt: null,
  });

  setImmediate(() => {
    require('./depositRequestNotificationService').notifyRejected(registration)
      .catch((err) => console.error('[deposit] notifyRejected falhou:', err.message));
  });

  return registration;
}

/**
 * Varre aprovacoes vencidas nao pagas: cancela a inscricao (libera vaga) e marca 'expired'.
 */
async function expirarAprovacoesVencidas({ limit = 50 } = {}) {
  const agora = new Date();
  const vencidas = await Registration.findAll({
    where: {
      depositApprovalStatus: 'approved',
      depositOfferExpiresAt: { [Op.lte]: agora },
      paymentStatus: { [Op.notIn]: ['partial', 'confirmed', 'cancelled', 'refunded'] },
    },
    order: [['depositOfferExpiresAt', 'ASC']],
    limit,
  });

  let expiradas = 0;
  for (const registration of vencidas) {
    try {
      await registrationService.cancelarInscricao(registration.id).catch((err) => {
        console.error(`[deposit] cancelar ao expirar ${registration.id} falhou:`, err.message);
      });
      await registration.update({ depositApprovalStatus: 'expired', depositOfferExpiresAt: null });
      expiradas += 1;
      setImmediate(() => {
        require('./depositRequestNotificationService').notifyRejected(registration, { expired: true })
          .catch(() => {});
      });
    } catch (err) {
      console.error(`[deposit] expirar ${registration.id} falhou:`, err.message);
    }
  }
  return { processed: vencidas.length, expired: expiradas };
}

// ===================== ADMIN =====================

async function listarPorEvento(eventId, { status } = {}) {
  const where = { eventId };
  if (status) {
    where.depositApprovalStatus = status;
  } else {
    where.depositApprovalStatus = { [Op.in]: ['requested', 'approved', 'rejected', 'expired'] };
  }

  const registrations = await Registration.findAll({
    where,
    attributes: [
      'id', 'orderCode', 'buyerData', 'finalPrice', 'paymentStatus',
      'depositApprovalStatus', 'requestedDepositAmount', 'approvedDepositAmount',
      'depositApprovedAt', 'depositOfferExpiresAt', 'createdAt',
    ],
    include: [
      { model: Event, as: 'event', attributes: ['id', 'minDepositAmount', 'belowMinDepositTtlHours'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  return Promise.all(registrations.map(async (r) => {
    const plain = r.toJSON();
    plain.pago = await paidTotal(r.id);
    return plain;
  }));
}

async function resumoPorEvento(eventId) {
  const rows = await Registration.findAll({
    where: {
      eventId,
      depositApprovalStatus: { [Op.in]: ['requested', 'approved', 'rejected', 'expired'] },
    },
    attributes: [
      'depositApprovalStatus',
      [Registration.sequelize.fn('COUNT', Registration.sequelize.col('id')), 'total'],
    ],
    group: ['depositApprovalStatus'],
    raw: true,
  });
  return rows.reduce((acc, r) => {
    acc[r.depositApprovalStatus] = Number(r.total);
    return acc;
  }, {});
}

module.exports = {
  solicitar,
  aprovar,
  recusar,
  expirarAprovacoesVencidas,
  listarPorEvento,
  resumoPorEvento,
};
