const { Registration, RegistrationAttendee, Event, EventBatch, Coupon } = require('../models');
const uuid = require('uuid');
const orderCodeService = require('./orderCodeService');
const batchService = require('./batchService');
const couponService = require('./couponService');
const formFieldService = require('./formFieldService');
const paymentService = require('./paymentService');
const eventService = require('./eventService');

/**
 * Processar inscrição pública completa
 */
async function processarInscricao(dadosInscricao) {
  const {
    eventId,
    batchId,
    couponCode,
    quantity,
    buyerData,
    attendeesData,
    paymentData
  } = dadosInscricao;

  // 1. Validar evento
  await eventService.buscarEventoPublicoPorId(eventId);
  
  // 2. Verificar disponibilidade do lote
  const { batch } = await batchService.verificarDisponibilidade(batchId, quantity);
  
  // 3. Calcular preço
  const precoUnitario = parseFloat(batch.price);
  const precoOriginal = precoUnitario * quantity;
  let precoFinal = precoOriginal;
  let desconto = 0;
  let couponId = null;
  
  // 4. Aplicar cupom se fornecido
  if (couponCode) {
    const resultadoCupom = await couponService.validarCupom(couponCode, eventId, precoOriginal);
    desconto = resultadoCupom.desconto;
    precoFinal = resultadoCupom.precoFinal;
    couponId = resultadoCupom.coupon.id;
  }
  
  // 5. Validar dados do comprador
  await formFieldService.validarDadosFormulario(eventId, buyerData, 'buyer');
  
  // 6. Validar dados dos inscritos
  if (!Array.isArray(attendeesData) || attendeesData.length !== quantity) {
    throw new Error(`Esperado ${quantity} inscrito(s), recebido ${attendeesData?.length || 0}`);
  }
  
  for (const attendeeData of attendeesData) {
    await formFieldService.validarDadosFormulario(eventId, attendeeData, 'attendee');
  }
  
  // 7. Gerar código único de pedido
  const orderCode = await orderCodeService.gerarCodigoUnico();
  
  // 8. Processar pagamento com Cielo
  const resultadoPagamento = await paymentService.criarTransacao({
    merchantOrderId: orderCode,
    customerName: buyerData.nome || buyerData.name || 'Cliente',
    amount: paymentService.converterParaCentavos(precoFinal),
    cardNumber: paymentData.cardNumber,
    holder: paymentData.holder,
    expirationDate: paymentData.expirationDate,
    securityCode: paymentData.securityCode,
    brand: paymentData.brand
  });
  
  if (!resultadoPagamento.sucesso) {
    throw new Error(`Erro no pagamento: ${resultadoPagamento.erro}`);
  }
  
  // 9. Criar registro de inscrição
  const registration = await Registration.create({
    id: uuid.v4(),
    orderCode,
    eventId,
    batchId,
    couponId,
    quantity,
    buyerData,
    originalPrice: precoOriginal,
    discountAmount: desconto,
    finalPrice: precoFinal,
    paymentStatus: paymentService.mapearStatusCielo(resultadoPagamento.status),
    paymentId: resultadoPagamento.paymentId,
    paymentMethod: 'CreditCard',
    cieloResponse: resultadoPagamento.dadosCompletos
  });
  
  // 10. Criar registros dos inscritos
  const attendeesPromises = attendeesData.map((attendeeData, index) => 
    RegistrationAttendee.create({
      id: uuid.v4(),
      registrationId: registration.id,
      attendeeData,
      attendeeNumber: index + 1
    })
  );
  const attendees = await Promise.all(attendeesPromises);
  
  // 11. Registrar transação de pagamento
  await paymentService.registrarTransacao(
    registration.id,
    'authorization',
    resultadoPagamento.status.toString(),
    resultadoPagamento
  );
  
  // 12. Incrementar contadores
  await batchService.incrementarQuantidade(batchId, quantity);
  
  if (couponId) {
    await couponService.incrementarUso(couponId);
  }
  
  // 13. Atualizar contador de inscrições do evento
  await Event.increment('currentRegistrations', {
    by: quantity,
    where: { id: eventId }
  });
  
  // 14. Capturar pagamento (confirmar)
  if (resultadoPagamento.status === 1) { // Authorized
    const captura = await paymentService.capturarPagamento(
      resultadoPagamento.paymentId,
      paymentService.converterParaCentavos(precoFinal)
    );
    
    if (captura.sucesso) {
      registration.paymentStatus = 'confirmed';
      await registration.save();
      
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
        as: 'attendees'
      }
    ],
    order: [['createdAt', 'DESC']]
  });
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
        as: 'attendees'
      }
    ],
    order: [['createdAt', 'DESC']]
  });
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
        as: 'attendees'
      }
    ]
  });
  
  if (!registration) {
    throw new Error('Inscrição não encontrada');
  }
  
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
        as: 'attendees'
      }
    ]
  });
  
  if (!registration) {
    throw new Error('Inscrição não encontrada');
  }
  
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
  
  // Cancelar pagamento na Cielo
  if (registration.paymentId) {
    const cancelamento = await paymentService.cancelarPagamento(
      registration.paymentId,
      paymentService.converterParaCentavos(registration.finalPrice)
    );
    
    if (cancelamento.sucesso) {
      registration.paymentStatus = 'cancelled';
      await registration.save();
      
      await paymentService.registrarTransacao(
        registration.id,
        'cancellation',
        cancelamento.status.toString(),
        cancelamento
      );
      
      // Decrementar contadores
      await batchService.incrementarQuantidade(registration.batchId, -registration.quantity);
      
      await Event.decrement('currentRegistrations', {
        by: registration.quantity,
        where: { id: registration.eventId }
      });
      
      return registration;
    } else {
      throw new Error(`Erro ao cancelar pagamento: ${cancelamento.erro}`);
    }
  }
  
  throw new Error('Inscrição não possui pagamento associado');
}

module.exports = {
  processarInscricao,
  listarInscricoes,
  listarInscricoesPorEvento,
  buscarInscricaoPorCodigo,
  buscarInscricaoPorId,
  cancelarInscricao
};
