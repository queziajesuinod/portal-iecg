const uuid = require('uuid');
const {
  Registration,
  RegistrationAttendee,
  Event,
  EventBatch,
  Coupon,
  FormField,
  PaymentOption,
  RegistrationPayment,
  User,
  Perfil,
  Permissao,
  sequelize
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

function normalizarValor(valor) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 0;
  return Number(numero.toFixed(2));
}

function calcularResumoPagamentos(registration, payments = []) {
  const paidTotal = payments.reduce((sum, payment) => (
    payment.status === 'confirmed' ? sum + Number(payment.amount || 0) : sum
  ), 0);
  const totalPago = normalizarValor(paidTotal);
  const precoFinal = normalizarValor(registration.finalPrice || 0);
  const remaining = normalizarValor(Math.max(0, precoFinal - totalPago));
  const derivedStatus = remaining <= 0 && precoFinal > 0
    ? 'confirmed'
    : totalPago > 0
      ? 'partial'
      : 'pending';

  return {
    paidTotal: totalPago,
    remaining,
    derivedStatus
  };
}

async function anexarResumoPagamentos(registration, options = {}) {
  if (!registration) return registration;
  const payments = await RegistrationPayment.findAll({
    where: { registrationId: registration.id },
    order: [['createdAt', 'ASC']],
    transaction: options.transaction
  });

  const resumo = calcularResumoPagamentos(registration, payments);
  registration.setDataValue('payments', payments);
  registration.setDataValue('paidTotal', resumo.paidTotal);
  registration.setDataValue('remaining', resumo.remaining);
  registration.setDataValue('paymentStatusDerived', resumo.derivedStatus);
  return resumo;
}

async function atualizarStatusPagamentoPorPagamentos(registration, options = {}) {
  if (!registration) return null;
  if (['cancelled', 'refunded'].includes(registration.paymentStatus)) {
    return null;
  }
  const resumo = await anexarResumoPagamentos(registration, options);
  if (!resumo) return null;
  if (registration.paymentStatus !== resumo.derivedStatus) {
    const statusAnterior = registration.paymentStatus;
    registration.paymentStatus = resumo.derivedStatus;
    await registration.save({ transaction: options.transaction });
    await ajustarContadoresDeStatus(registration, statusAnterior);
  }
  return resumo;
}

async function usuarioPodeRegistrarPagamentoOffline(userId) {
  if (!userId) return false;
  const usuario = await User.findByPk(userId, {
    include: [{
      model: Perfil,
      include: [{ model: Permissao, as: 'permissoes', through: { attributes: [] } }]
    }]
  });
  if (!usuario) return false;
  const permissoes = usuario.Perfil?.permissoes?.map((perm) => perm.nome) || [];
  if (permissoes.includes('ADMIN_FULL_ACCESS')) return true;
  return (usuario.Perfil?.descricao || '').toLowerCase().includes('admin');
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
  const paymentOption = await PaymentOption.findByPk(paymentOptionId);

  if (!paymentOption || !paymentOption.isActive) {
    throw new Error('Forma de pagamento inválida ou inativa');
  }

  // 8.1. Calcular valor final com juros (se houver parcelas)
  const paymentMode = evento.registrationPaymentMode || 'SINGLE';
  const valorInformado = normalizarValor(paymentData.amount || paymentData.valor || 0);
  if (paymentMode === 'BALANCE_DUE' && valorInformado > 0) {
    if (valorInformado > precoFinal) {
      throw new Error('Valor do pagamento não pode ser maior que o total da inscrição');
    }
    if (evento.minDepositAmount && valorInformado < Number(evento.minDepositAmount)) {
      throw new Error(`Valor mínimo de sinal é R$ ${Number(evento.minDepositAmount).toFixed(2).replace('.', ',')}`);
    }
  }

  const valorBasePagamento = paymentMode === 'BALANCE_DUE' && valorInformado > 0
    ? valorInformado
    : precoFinal;
  let valorFinalComJuros = valorBasePagamento;
  const parcelas = paymentData.installments || 1;

  if (paymentOption.paymentType === 'credit_card' && parcelas > 1 && paymentOption.interestRate > 0) {
    if (paymentOption.interestType === 'percentage') {
      // Juros percentual por parcela
      valorFinalComJuros += valorBasePagamento * (paymentOption.interestRate / 100) * (parcelas - 1);
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
    finalPrice: paymentMode === 'BALANCE_DUE' ? precoFinal : valorFinalComJuros,
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

  await RegistrationPayment.create({
    id: uuid.v4(),
    registrationId: registration.id,
    channel: 'ONLINE',
    method: paymentMethod,
    amount: valorFinalComJuros,
    status: paymentService.mapearStatusCielo(resultadoPagamento.status),
    provider: 'cielo',
    providerPaymentId: resultadoPagamento.paymentId,
    providerPayload: resultadoPagamento.dadosCompletos,
    pixQrCode: resultadoPagamento.qrCodeString || null,
    pixQrCodeBase64: resultadoPagamento.qrCodeBase64 || null,
    installments: paymentOption.paymentType === 'credit_card' ? parcelas : null
  });

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
      paymentService.converterParaCentavos(valorFinalComJuros)
    );

    if (captura.sucesso) {
      const statusAnteriorConfirmacao = registration.paymentStatus;
      registration.paymentStatus = 'confirmed';
      await registration.save();

      await ajustarContadoresDeStatus(registration, statusAnteriorConfirmacao);

      await RegistrationPayment.update(
        {
          status: 'confirmed',
          providerPayload: captura.dadosCompletos || null
        },
        { where: { providerPaymentId: resultadoPagamento.paymentId } }
      );

      await paymentService.registrarTransacao(
        registration.id,
        'capture',
        captura.status.toString(),
        captura
      );
    }
  }

  if (paymentMode === 'BALANCE_DUE') {
    await atualizarStatusPagamentoPorPagamentos(registration);
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
        attributes: ['id', 'title', 'startDate', 'location', 'registrationPaymentMode', 'minDepositAmount', 'maxPaymentCount']
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
  await anexarResumoPagamentos(registration);

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
  await anexarResumoPagamentos(registration);

  return registration;
}

async function criarPagamentoOnline(registrationId, payload = {}) {
  const registration = await Registration.findByPk(registrationId, {
    include: [
      {
        model: Event,
        as: 'event'
      }
    ]
  });

  if (!registration) {
    throw new Error('Inscrição não encontrada');
  }

  if (registration.event?.registrationPaymentMode !== 'BALANCE_DUE') {
    throw new Error('Evento não permite pagamentos parciais');
  }

  const resumoAtual = await anexarResumoPagamentos(registration);
  const pagamentosExistentes = registration.getDataValue('payments') || [];
  const remaining = resumoAtual?.remaining ?? normalizarValor(registration.finalPrice || 0);

  const amount = normalizarValor(payload.amount || 0);
  if (amount <= 0) {
    throw new Error('Valor do pagamento deve ser maior que zero');
  }

  if (amount > remaining) {
    throw new Error('Valor do pagamento não pode ser maior que o saldo restante');
  }

  if (registration.event?.minDepositAmount && resumoAtual?.paidTotal === 0) {
    if (amount < Number(registration.event.minDepositAmount)) {
      throw new Error(`Valor mínimo de sinal é R$ ${Number(registration.event.minDepositAmount).toFixed(2).replace('.', ',')}`);
    }
  }

  if (registration.event?.maxPaymentCount && pagamentosExistentes.length >= registration.event.maxPaymentCount) {
    throw new Error('Quantidade máxima de pagamentos atingida');
  }

  const paymentOption = await PaymentOption.findByPk(payload.paymentOptionId);
  if (!paymentOption || !paymentOption.isActive) {
    throw new Error('Forma de pagamento inválida ou inativa');
  }
  if (paymentOption.eventId && paymentOption.eventId !== registration.eventId) {
    throw new Error('Forma de pagamento não pertence ao evento da inscrição');
  }

  const paymentData = payload.paymentData || {};
  const parcelas = paymentData.installments || 1;
  let valorFinalComJuros = amount;
  if (paymentOption.paymentType === 'credit_card' && parcelas > 1 && paymentOption.interestRate > 0) {
    if (paymentOption.interestType === 'percentage') {
      valorFinalComJuros += amount * (paymentOption.interestRate / 100) * (parcelas - 1);
    } else {
      valorFinalComJuros += paymentOption.interestRate * (parcelas - 1);
    }
  }

  const merchantOrderId = `${registration.orderCode}-P${pagamentosExistentes.length + 1}`;
  let resultadoPagamento;
  if (paymentOption.paymentType === 'pix') {
    resultadoPagamento = await paymentService.criarTransacaoPix({
      merchantOrderId,
      customerName: registration.buyerData?.nome || registration.buyerData?.name || 'Cliente',
      customerEmail: registration.buyerData?.email || 'sem-email@exemplo.com',
      customerDocument: (registration.buyerData?.cpf || registration.buyerData?.documento || '00000000000').replace(/\D/g, ''),
      amount: paymentService.converterParaCentavos(valorFinalComJuros)
    });
  } else if (paymentOption.paymentType === 'credit_card') {
    const cardNumber = (paymentData.cardNumber || '').replace(/\D/g, '');
    const expirationDate = paymentData.expirationDate || '';
    let { brand } = paymentData;
    if (!brand && cardNumber) {
      brand = paymentService.detectarBandeira(cardNumber);
    }
    resultadoPagamento = await paymentService.criarTransacao({
      merchantOrderId,
      customerName: registration.buyerData?.nome || registration.buyerData?.name || 'Cliente',
      customerEmail: registration.buyerData?.email || 'sem-email@exemplo.com',
      customerDocument: (registration.buyerData?.cpf || registration.buyerData?.documento || '00000000000').replace(/\D/g, ''),
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

  const paymentRecord = await RegistrationPayment.create({
    id: uuid.v4(),
    registrationId: registration.id,
    channel: 'ONLINE',
    method: paymentOption.paymentType,
    amount: valorFinalComJuros,
    status: paymentService.mapearStatusCielo(resultadoPagamento.status),
    provider: 'cielo',
    providerPaymentId: resultadoPagamento.paymentId,
    providerPayload: resultadoPagamento.dadosCompletos,
    pixQrCode: resultadoPagamento.qrCodeString || null,
    pixQrCodeBase64: resultadoPagamento.qrCodeBase64 || null,
    installments: paymentOption.paymentType === 'credit_card' ? parcelas : null
  });

  await paymentService.registrarTransacao(
    registration.id,
    'authorization',
    resultadoPagamento.status.toString(),
    resultadoPagamento
  );

  if (resultadoPagamento.status === 1) { // Authorized
    const captura = await paymentService.capturarPagamento(
      resultadoPagamento.paymentId,
      paymentService.converterParaCentavos(valorFinalComJuros)
    );

    if (captura.sucesso) {
      paymentRecord.status = 'confirmed';
      paymentRecord.providerPayload = captura.dadosCompletos || paymentRecord.providerPayload;
      await paymentRecord.save();
      await paymentService.registrarTransacao(
        registration.id,
        'capture',
        captura.status.toString(),
        captura
      );
    }
  }

  await atualizarStatusPagamentoPorPagamentos(registration);

  return {
    pagamento: resultadoPagamento,
    payment: paymentRecord
  };
}

async function criarPagamentoOffline(registrationId, payload = {}, userId) {
  const permitido = await usuarioPodeRegistrarPagamentoOffline(userId);
  if (!permitido) {
    throw new Error('Usuário não autorizado a registrar pagamento offline');
  }

  const registration = await Registration.findByPk(registrationId, {
    include: [
      {
        model: Event,
        as: 'event'
      }
    ]
  });

  if (!registration) {
    throw new Error('Inscrição não encontrada');
  }

  const resumoAtual = await anexarResumoPagamentos(registration);
  const remaining = resumoAtual?.remaining ?? normalizarValor(registration.finalPrice || 0);
  const amount = normalizarValor(payload.amount || 0);

  if (amount <= 0) {
    throw new Error('Valor do pagamento deve ser maior que zero');
  }

  if (amount > remaining) {
    throw new Error('Valor do pagamento não pode ser maior que o saldo restante');
  }

  const metodo = payload.method || 'manual';
  if (!['cash', 'pos', 'transfer', 'manual'].includes(metodo)) {
    throw new Error('Método de pagamento offline inválido');
  }

  return sequelize.transaction(async (transaction) => {
    const paymentRecord = await RegistrationPayment.create({
      id: uuid.v4(),
      registrationId: registration.id,
      channel: 'OFFLINE',
      method: metodo,
      amount,
      status: 'confirmed',
      provider: 'offline',
      createdBy: userId,
      confirmedBy: userId,
      confirmedAt: new Date(),
      notes: payload.notes || null
    }, { transaction });

    await atualizarStatusPagamentoPorPagamentos(registration, { transaction });

    return {
      payment: paymentRecord
    };
  });
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
  criarPagamentoOnline,
  criarPagamentoOffline,
  cancelarInscricao,
  ajustarContadoresDeStatus,
  atualizarStatusPagamentoPorPagamentos,
  anexarResumoPagamentos
};
