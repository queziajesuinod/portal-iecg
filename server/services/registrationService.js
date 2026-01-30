const uuid = require('uuid');
const {
  Registration, RegistrationAttendee, Event, EventBatch, Coupon, FormField
} = require('../models');
const { isCountablePaymentStatus } = require('../constants/registrationStatuses');
const orderCodeService = require('./orderCodeService');
const batchService = require('./batchService');
const couponService = require('./couponService');
const formFieldService = require('./formFieldService');
const paymentService = require('./paymentService');
const eventService = require('./eventService');

function extrairResumoLote(attendees = []) {
  const batches = attendees
    .map(att => att.batch)
    .filter(Boolean);

  const uniqueBatches = Array.from(
    new Map(batches.map(batch => [batch.id, batch])).values()
  );

  if (!uniqueBatches.length) {
    return null;
  }

  if (uniqueBatches.length === 1) {
    const [batch] = uniqueBatches;
    return {
      name: batch.name,
      price: Number(batch.price)
    };
  }

  return {
    name: uniqueBatches.map(batch => batch.name).join(' / '),
    price: null
  };
}

function aplicarResumoLote(registration) {
  if (!registration) {
    return;
  }

  const summary = extrairResumoLote(registration.attendees || []);
  if (summary) {
    registration.setDataValue('batchName', summary.name);
    registration.setDataValue('batchPrice', summary.price);
  }
}

function mapDataComLabel(data = {}, labelsMap = {}) {
  return Object.entries(data).map(([fieldName, value]) => ({
    fieldName,
    label: labelsMap[fieldName] || fieldName,
    value
  }));
}

async function carregarMapeamentoCampos(eventId) {
  if (!eventId) {
    return { buyer: {}, attendee: {} };
  }
  const campos = await FormField.findAll({
    where: { eventId }
  });

  return campos.reduce(
    (acc, campo) => {
      const section = campo.section || 'attendee';
      acc[section][campo.fieldName] = campo.fieldLabel;
      return acc;
    },
    { buyer: {}, attendee: {} }
  );
}

function aplicarLabelsFormulario(registration, fieldMaps) {
  if (!registration) return;
  registration.setDataValue('buyerLabeledFields', mapDataComLabel(registration.buyerData, fieldMaps.buyer));
  (registration.attendees || []).forEach(attendee => {
    attendee.setDataValue('labeledData', mapDataComLabel(attendee.attendeeData || {}, fieldMaps.attendee));
  });
}

async function prepararRegistroComCampos(registration) {
  if (!registration) return registration;
  const fieldMaps = await carregarMapeamentoCampos(registration.eventId);
  aplicarLabelsFormulario(registration, fieldMaps);
  aplicarResumoLote(registration);
  return registration;
}

async function prepararListaComCampos(registrations) {
  if (!Array.isArray(registrations)) return registrations;
  await Promise.all(registrations.map(reg => prepararRegistroComCampos(reg)));
  return registrations;
}

async function contarInscritosPorLote(registrationId) {
  const attendees = await RegistrationAttendee.findAll({
    where: { registrationId },
    attributes: ['batchId']
  });

  return attendees.reduce((acc, attendee) => {
    const { batchId } = attendee;
    if (!batchId) {
      return acc;
    }

    acc[batchId] = (acc[batchId] || 0) + 1;
    return acc;
  }, {});
}

async function ajustarContadoresDeStatus(registration, statusAnterior) {
  if (!registration) {
    return;
  }

  const novoStatusContabilizavel = isCountablePaymentStatus(registration.paymentStatus);
  const statusAnteriorContabilizavel = isCountablePaymentStatus(statusAnterior);

  if (novoStatusContabilizavel === statusAnteriorContabilizavel) {
    return;
  }

  const quantidadeInscritos = Math.max(0, Number(registration.quantity || 0));
  if (quantidadeInscritos && registration.eventId) {
    if (novoStatusContabilizavel) {
      await Event.increment('currentRegistrations', {
        by: quantidadeInscritos,
        where: { id: registration.eventId }
      });
    } else {
      await Event.decrement('currentRegistrations', {
        by: quantidadeInscritos,
        where: { id: registration.eventId }
      });
    }
  }

  const lotesCounts = await contarInscritosPorLote(registration.id);
  const batchUpdates = Object.entries(lotesCounts)
    .filter(([batchId, count]) => batchId && count > 0)
    .map(([batchId, count]) => batchService.incrementarQuantidade(batchId, count * (novoStatusContabilizavel ? 1 : -1)));

  if (batchUpdates.length) {
    await Promise.all(batchUpdates);
  }
}

/**
 * Processar inscrição pública completa
 */
async function processarInscricao(dadosInscricao) {
  const {
    eventId,
    couponCode,
    quantity,
    buyerData,
    attendeesData,
    paymentData,
    paymentOptionId // ID da forma de pagamento selecionada
  } = dadosInscricao;

  // 1. Validar evento
  const evento = await eventService.buscarEventoPublicoPorId(eventId);

  // 1.1. Validar limite por comprador
  if (evento.maxPerBuyer && quantity > evento.maxPerBuyer) {
    throw new Error(`Este evento permite no máximo ${evento.maxPerBuyer} inscrição(ões) por comprador`);
  }

  // 2. Validar que cada inscrito tem um batchId
  if (!Array.isArray(attendeesData) || attendeesData.length !== quantity) {
    throw new Error(`Esperado ${quantity} inscrito(s), recebido ${attendeesData?.length || 0}`);
  }

  // Validar que cada inscrito tem lote (batchId)
  const semLote = attendeesData.find(att => !att.batchId);
  if (semLote) {
    throw new Error('Cada inscrito deve ter um lote (batchId) associado');
  }

  // 2.1. Contar quantos inscritos por lote
  const lotesCounts = {};
  attendeesData.forEach(att => {
    lotesCounts[att.batchId] = (lotesCounts[att.batchId] || 0) + 1;
  });

  // 2.2. Verificar disponibilidade de cada lote (paralelo)
  const lotesData = {};
  const loteIds = Object.keys(lotesCounts);
  const verificacoes = loteIds.map(async (loteId) => {
    const { batch } = await batchService.verificarDisponibilidade(loteId, lotesCounts[loteId]);
    return { loteId, batch };
  });
  const resultados = await Promise.all(verificacoes);
  resultados.forEach(({ loteId, batch }) => {
    lotesData[loteId] = batch;
  });

  // 3. Calcular preço total somando preço de cada inscrito
  const precoOriginal = attendeesData.reduce((sum, att) => {
    const lote = lotesData[att.batchId];
    return sum + parseFloat(lote.price);
  }, 0);
  let precoFinal = precoOriginal;
  let desconto = 0;
  let couponId = null;

  // 4. Aplicar cupom se fornecido
  if (couponCode) {
    const quantidadeIngressos = Number(quantity);
    const quantidadeParaValidacao = Number.isFinite(quantidadeIngressos) ? quantidadeIngressos : 0;
    const resultadoCupom = await couponService.validarCupom(
      couponCode,
      eventId,
      precoOriginal,
      quantidadeParaValidacao
    );
    desconto = resultadoCupom.desconto;
    precoFinal = resultadoCupom.precoFinal;
    couponId = resultadoCupom.coupon.id;
  }

  // 5. Validar dados do comprador
  await formFieldService.validarDadosFormulario(eventId, buyerData, 'buyer');

  // 6. Validar dados dos inscritos (paralelo)
  const validacoes = attendeesData.map(attendee => formFieldService.validarDadosFormulario(eventId, attendee.data || attendee, 'attendee')
  );
  await Promise.all(validacoes);

  // 7. Gerar código único de pedido
  const orderCode = await orderCodeService.gerarCodigoUnico();

  // 8. Buscar configuração de pagamento
  const { PaymentOption } = require('../models');
  const paymentOption = await PaymentOption.findByPk(paymentOptionId);

  if (!paymentOption || !paymentOption.isActive) {
    throw new Error('Forma de pagamento inválida ou inativa');
  }

  // 8.1. Calcular valor final com juros (se houver parcelas)
  let valorFinalComJuros = precoFinal;
  const parcelas = paymentData.installments || 1;

  if (paymentOption.paymentType === 'credit_card' && parcelas > 1 && paymentOption.interestRate > 0) {
    if (paymentOption.interestType === 'percentage') {
      // Juros percentual por parcela
      valorFinalComJuros += precoFinal * (paymentOption.interestRate / 100) * (parcelas - 1);
    } else {
      // Juros fixo por parcela
      valorFinalComJuros += paymentOption.interestRate * (parcelas - 1);
    }
  }

  // 8.2. Processar pagamento conforme o tipo
  let resultadoPagamento;
  const paymentMethod = paymentOption.paymentType;

  if (paymentOption.paymentType === 'pix') {
    // Pagamento via PIX
    resultadoPagamento = await paymentService.criarTransacaoPix({
      merchantOrderId: orderCode,
      customerName: buyerData.nome || buyerData.name || 'Cliente',
      customerEmail: buyerData.email || 'sem-email@exemplo.com',
      customerDocument: (buyerData.cpf || buyerData.documento || '00000000000').replace(/\D/g, ''),
      amount: paymentService.converterParaCentavos(valorFinalComJuros)
    });
  } else if (paymentOption.paymentType === 'credit_card') {
    // Pagamento via Cartão de Crédito

    // Limpar e formatar dados do cartão
    const cardNumber = (paymentData.cardNumber || '').replace(/\D/g, '');
    // Cielo espera MM/YYYY (com barra), não remover a barra
    const expirationDate = paymentData.expirationDate || '';

    // Detectar bandeira do cartão se não foi fornecida
    let { brand } = paymentData;
    if (!brand && cardNumber) {
      brand = paymentService.detectarBandeira(cardNumber);
    }

    resultadoPagamento = await paymentService.criarTransacao({
      merchantOrderId: orderCode,
      customerName: buyerData.nome || buyerData.name || 'Cliente',
      customerEmail: buyerData.email || 'sem-email@exemplo.com',
      customerDocument: (buyerData.cpf || buyerData.documento || '00000000000').replace(/\D/g, ''),
      amount: paymentService.converterParaCentavos(valorFinalComJuros),
      installments: parcelas,
      cardNumber,
      holder: paymentData.cardHolder || paymentData.holder,
      expirationDate,
      securityCode: paymentData.securityCode,
      brand
    });
  } else {
    throw new Error(`Tipo de pagamento não suportado: ${paymentOption.paymentType}`);
  }

  if (!resultadoPagamento.sucesso) {
    throw new Error(`Erro no pagamento: ${resultadoPagamento.erro}`);
  }

  // 9. Criar registro de inscrição
  const registration = await Registration.create({
    id: uuid.v4(),
    orderCode,
    eventId,
    batchId: null, // Cada inscrito tem seu lote em RegistrationAttendees
    couponId,
    quantity,
    buyerData,
    originalPrice: precoOriginal,
    discountAmount: desconto,
    finalPrice: valorFinalComJuros,
    paymentStatus: paymentService.mapearStatusCielo(resultadoPagamento.status),
    paymentId: resultadoPagamento.paymentId,
    paymentMethod,
    cieloResponse: resultadoPagamento.dadosCompletos,
    // Dados específicos do PIX
    pixQrCode: resultadoPagamento.qrCodeString || null,
    pixQrCodeBase64: resultadoPagamento.qrCodeBase64 || null
  });

  // 10. Criar registros dos inscritos com seus respectivos lotes
  const attendeesPromises = attendeesData.map((attendee, index) => RegistrationAttendee.create({
    id: uuid.v4(),
    registrationId: registration.id,
    batchId: attendee.batchId,
    attendeeData: attendee.data || attendee,
    attendeeNumber: index + 1
  }));

  await Promise.all(attendeesPromises);

  const attendees = await RegistrationAttendee.findAll({
    where: { registrationId: registration.id },
    include: [
      {
        model: EventBatch,
        as: 'batch',
        attributes: ['id', 'name', 'price']
      }
    ],
    order: [['attendeeNumber', 'ASC']]
  });

  registration.attendees = attendees;
  await prepararRegistroComCampos(registration);

  // 11. Registrar transação de pagamento
  await paymentService.registrarTransacao(
    registration.id,
    'authorization',
    resultadoPagamento.status.toString(),
    resultadoPagamento
  );

  if (couponId) {
    await couponService.incrementarUso(couponId);
  }

  await ajustarContadoresDeStatus(registration, null);

  // 14. Capturar pagamento (confirmar)
  if (resultadoPagamento.status === 1) { // Authorized
    const captura = await paymentService.capturarPagamento(
      resultadoPagamento.paymentId,
      paymentService.converterParaCentavos(precoFinal)
    );

    if (captura.sucesso) {
      const statusAnteriorConfirmacao = registration.paymentStatus;
      registration.paymentStatus = 'confirmed';
      await registration.save();

      await ajustarContadoresDeStatus(registration, statusAnteriorConfirmacao);

      await paymentService.registrarTransacao(
        registration.id,
        'capture',
        captura.status.toString(),
        captura
      );
    }
  }

  return {
    sucesso: true,
    orderCode,
    registration,
    attendees,
    pagamento: resultadoPagamento
  };
}

/**
 * Listar todas as inscrições (admin)
 */
async function listarInscricoes() {
  return Registration.findAll({
    include: [
      {
        model: Event,
        as: 'event',
        attributes: ['id', 'title']
      },
      {
        model: EventBatch,
        as: 'batch',
        attributes: ['id', 'name', 'price']
      },
      {
        model: Coupon,
        as: 'coupon',
        attributes: ['id', 'code', 'discountType', 'discountValue']
      },
      {
        model: RegistrationAttendee,
        as: 'attendees',
        include: [
          {
            model: EventBatch,
            as: 'batch',
            attributes: ['id', 'name', 'price']
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  }).then(prepararListaComCampos);
}

/**
 * Listar inscrições por evento
 */
async function listarInscricoesPorEvento(eventId) {
  return Registration.findAll({
    where: { eventId },
    include: [
      {
        model: EventBatch,
        as: 'batch',
        attributes: ['id', 'name', 'price']
      },
      {
        model: Coupon,
        as: 'coupon',
        attributes: ['id', 'code']
      },
      {
        model: RegistrationAttendee,
        as: 'attendees',
        include: [
          {
            model: EventBatch,
            as: 'batch',
            attributes: ['id', 'name', 'price']
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  }).then(prepararListaComCampos);
}

/**
 * Buscar inscrição por código de pedido
 */
async function buscarInscricaoPorCodigo(orderCode) {
  const registration = await Registration.findOne({
    where: { orderCode },
    include: [
      {
        model: Event,
        as: 'event',
        attributes: ['id', 'title', 'startDate', 'location']
      },
      {
        model: EventBatch,
        as: 'batch',
        attributes: ['id', 'name', 'price']
      },
      {
        model: Coupon,
        as: 'coupon',
        attributes: ['id', 'code', 'discountType', 'discountValue']
      },
      {
        model: RegistrationAttendee,
        as: 'attendees',
        include: [
          {
            model: EventBatch,
            as: 'batch',
            attributes: ['id', 'name', 'price']
          }
        ]
      }
    ]
  });

  if (!registration) {
    throw new Error('Inscrição não encontrada');
  }

  await prepararRegistroComCampos(registration);

  return registration;
}

/**
 * Buscar inscrição por ID
 */
async function buscarInscricaoPorId(id) {
  const registration = await Registration.findByPk(id, {
    include: [
      {
        model: Event,
        as: 'event'
      },
      {
        model: EventBatch,
        as: 'batch'
      },
      {
        model: Coupon,
        as: 'coupon'
      },
      {
        model: RegistrationAttendee,
        as: 'attendees',
        include: [
          {
            model: EventBatch,
            as: 'batch',
            attributes: ['id', 'name', 'price']
          }
        ]
      }
    ]
  });

  if (!registration) {
    throw new Error('Inscrição não encontrada');
  }

  await prepararRegistroComCampos(registration);

  return registration;
}

/**
 * Cancelar inscrição e reembolsar
 */
async function cancelarInscricao(id) {
  const registration = await buscarInscricaoPorId(id);

  if (registration.paymentStatus === 'cancelled' || registration.paymentStatus === 'refunded') {
    throw new Error('Inscrição já foi cancelada');
  }

  const environment = process.env.CIELO_ENVIRONMENT || 'sandbox';
  const isProductionEnvironment = environment === 'production';

  const aplicarCancelamentoLocal = async (status, mensagem) => {
    const statusAnterior = registration.paymentStatus;
    registration.paymentStatus = status;
    await registration.save();

    await paymentService.registrarTransacao(
      registration.id,
      'cancellation',
      'sandbox',
      {
        sucesso: true,
        status: 'sandbox',
        dadosCompletos: { message: mensagem }
      }
    );

    await ajustarContadoresDeStatus(registration, statusAnterior);

    return registration;
  };

  if (!registration.paymentId || !isProductionEnvironment) {
    return aplicarCancelamentoLocal('cancelled', 'Ambiente sandbox: pagamento ignorado');
  }

  // Cancelar pagamento na Cielo
  const amountCentavos = paymentService.converterParaCentavos(registration.finalPrice);
  const jaCapturado = ['confirmed', 'paid'].includes(registration.paymentStatus);
  const fazerCancelamento = async () => {
    const attemptVoid = async () => ({
      ...await paymentService.cancelarPagamento(registration.paymentId, amountCentavos),
      type: 'cancellation'
    });
    const attemptRefund = async () => ({
      ...await paymentService.estornarPagamento(registration.paymentId, amountCentavos),
      type: 'refund'
    });

    if (jaCapturado) {
      const result = await attemptRefund();
      if (result.sucesso) return result;
      return attemptVoid();
    }

    const result = await attemptVoid();
    if (result.sucesso) return result;
    return attemptRefund();
  };

  const cancelamento = await fazerCancelamento();

  if (cancelamento.sucesso) {
    const statusAnterior = registration.paymentStatus;
    registration.paymentStatus = cancelamento.type === 'refund' ? 'refunded' : 'cancelled';
    await registration.save();

    await paymentService.registrarTransacao(
      registration.id,
      cancelamento.type,
      cancelamento.status.toString(),
      cancelamento
    );

    await ajustarContadoresDeStatus(registration, statusAnterior);

    return registration;
  }

  throw new Error(`Erro ao cancelar pagamento: ${cancelamento.erro}`);
}

module.exports = {
  processarInscricao,
  listarInscricoes,
  listarInscricoesPorEvento,
  buscarInscricaoPorCodigo,
  buscarInscricaoPorId,
  cancelarInscricao,
  ajustarContadoresDeStatus
};
