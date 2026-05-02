const { Op } = require('sequelize');
const {
  RegistrationPayment,
  Registration,
  Event,
  FinancialExpense,
  FinancialManualEntry,
  FinancialFeeConfig,
  User
} = require('../models');
const paymentService = require('./paymentService');
const {
  now,
  parseDateOnly,
  todayDateOnly
} = require('../utils/dateTime');
const { buildUnfinishedEventWhere } = require('./eventService');

const ALLOWED_PAYMENT_METHODS = [
  'pix',
  'credit_card',
  'debit_card',
  'boleto',
  'cash',
  'transfer',
  'pos',
  'manual',
  'offline',
  'other'
];
const ACTIVE_FINANCIAL_ENTRY_STATUSES = ['pending', 'authorized', 'confirmed'];

function toMoney(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(2));
}

function normalizeOptionalValue(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    return null;
  }
  return normalized;
}

function parseIsoDate(value) {
  const normalized = normalizeOptionalValue(value);
  if (!normalized) return null;

  const parsed = parseDateOnly(normalized);
  if (!parsed) return null;

  return {
    iso: parsed.format('YYYY-MM-DD'),
    start: parsed.clone().startOf('day').toDate(),
    end: parsed.clone().endOf('day').toDate()
  };
}

function buildDateRange(field, dateFrom, dateTo, options = {}) {
  const { dateOnly = false } = options;
  const range = {};
  const parsedFrom = parseIsoDate(dateFrom);
  const parsedTo = parseIsoDate(dateTo);

  if (parsedFrom) {
    range[Op.gte] = dateOnly
      ? parsedFrom.iso
      : parsedFrom.start;
  }

  if (parsedTo) {
    range[Op.lte] = dateOnly
      ? parsedTo.iso
      : parsedTo.end;
  }

  if (!Object.keys(range).length) {
    return {};
  }

  return { [field]: range };
}

function normalizeInstallmentPercent(rawInstallmentPercent = {}) {
  if (!rawInstallmentPercent || typeof rawInstallmentPercent !== 'object') {
    return {};
  }

  return Object.entries(rawInstallmentPercent).reduce((acc, [installments, percent]) => {
    const installmentCount = Number(installments);
    const parsedPercent = Number(percent || 0);
    if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 12) {
      return acc;
    }
    if (!Number.isFinite(parsedPercent) || parsedPercent < 0) {
      return acc;
    }
    acc[String(installmentCount)] = parsedPercent;
    return acc;
  }, {});
}

function normalizeBrandKey(brand) {
  const normalized = paymentService.normalizeCardBrand(brand);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeCreditCardBrandRates(rawBrandRates = {}) {
  if (!rawBrandRates || typeof rawBrandRates !== 'object') {
    return {};
  }

  return Object.entries(rawBrandRates).reduce((acc, [brandKey, rawConfig]) => {
    const normalizedBrandKey = normalizeBrandKey(brandKey);
    if (!normalizedBrandKey) return acc;
    const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
    const defaultPercent = Number(config.defaultPercent ?? config.mdrPercent ?? 0);
    const minimumFee = toMoney(config.minimumFee ?? config.fixedFee ?? 0);

    if (!Number.isFinite(defaultPercent) || defaultPercent < 0) return acc;
    if (!Number.isFinite(minimumFee) || minimumFee < 0) return acc;

    const installmentSource = config.installmentPercent || config.installmentMdrPercent || {};
    acc[normalizedBrandKey] = {
      defaultPercent,
      minimumFee,
      installmentPercent: normalizeInstallmentPercent(installmentSource)
    };
    return acc;
  }, {});
}

function serializeFeeConfig(config) {
  return {
    id: config.id,
    pixPercent: Number(config.pixPercent || 0),
    pixFixedFee: toMoney(config.pixFixedFee || 0),
    creditCardDefaultPercent: Number(config.creditCardDefaultPercent || 0),
    creditCardFixedFee: toMoney(config.creditCardFixedFee || 0),
    creditCardInstallmentPercent: normalizeInstallmentPercent(config.creditCardInstallmentPercent),
    creditCardBrandRates: normalizeCreditCardBrandRates(config.creditCardBrandRates),
    updatedAt: config.updatedAt
  };
}

function buildFallbackFeeConfig() {
  return {
    id: null,
    pixPercent: Number(process.env.FINANCIAL_PIX_PERCENT || 0),
    pixFixedFee: Number(process.env.FINANCIAL_PIX_FIXED_FEE || 0),
    creditCardDefaultPercent: Number(process.env.FINANCIAL_CREDIT_CARD_DEFAULT_PERCENT || 0),
    creditCardFixedFee: Number(process.env.FINANCIAL_CREDIT_CARD_FIXED_FEE || 0),
    creditCardInstallmentPercent: {},
    creditCardBrandRates: {},
    updatedAt: null,
    _isFallback: true
  };
}

async function getActiveFeeConfig() {
  try {
    let config = await FinancialFeeConfig.findOne({
      where: { isActive: true },
      order: [['updatedAt', 'DESC']]
    });

    if (!config) {
      config = await FinancialFeeConfig.create({
        pixPercent: Number(process.env.FINANCIAL_PIX_PERCENT || 0),
        pixFixedFee: Number(process.env.FINANCIAL_PIX_FIXED_FEE || 0),
        creditCardDefaultPercent: Number(process.env.FINANCIAL_CREDIT_CARD_DEFAULT_PERCENT || 0),
        creditCardFixedFee: Number(process.env.FINANCIAL_CREDIT_CARD_FIXED_FEE || 0),
        creditCardInstallmentPercent: {},
        creditCardBrandRates: {}
      });
    }

    return config;
  } catch (error) {
    if (error?.original?.code === '42P01') {
      return buildFallbackFeeConfig();
    }
    throw error;
  }
}

function calculateConfiguredFee(payment, feeConfig) {
  const { method } = payment;
  const amount = toMoney(payment.amount);

  if (method === 'pix') {
    const percent = Number(feeConfig.pixPercent || 0);
    const fixed = toMoney(feeConfig.pixFixedFee || 0);
    const feeAmount = toMoney((amount * percent) / 100 + fixed);
    return {
      feeAmount,
      details: {
        method: 'pix',
        mdrPercent: percent,
        rrPercent: 0,
        totalPercent: percent,
        minimumFee: fixed,
        usedMinimumFee: false
      }
    };
  }

  if (method === 'credit_card') {
    const brandFromPayment = paymentService.normalizeCardBrand(payment.cardBrand)
      || paymentService.extrairBandeiraCartao(payment.providerPayload);
    const brandKey = normalizeBrandKey(brandFromPayment);
    const brandRates = normalizeCreditCardBrandRates(feeConfig.creditCardBrandRates);
    const brandRateConfig = brandKey ? brandRates[brandKey] : null;

    const rrInstallmentPercentMap = normalizeInstallmentPercent(feeConfig.creditCardInstallmentPercent);
    const brandInstallmentMdrMap = normalizeInstallmentPercent(brandRateConfig?.installmentPercent);
    const installments = Number(payment.installments || 1);
    const brandInstallmentMdr = Number(brandInstallmentMdrMap[String(installments)]);
    const rrPercent = Number(rrInstallmentPercentMap[String(installments)] || 0);
    const mdrPercent = Number.isFinite(brandInstallmentMdr)
      ? brandInstallmentMdr
      : brandRateConfig && Number.isFinite(Number(brandRateConfig.defaultPercent))
        ? Number(brandRateConfig.defaultPercent)
        : Number(feeConfig.creditCardDefaultPercent || 0);

    const totalPercent = mdrPercent + rrPercent;
    const minimumFee = brandRateConfig
      ? toMoney((brandRateConfig.minimumFee ?? feeConfig.creditCardFixedFee) || 0)
      : toMoney(feeConfig.creditCardFixedFee || 0);
    const percentFee = toMoney((amount * totalPercent) / 100);
    const usedMinimumFee = minimumFee > 0 && percentFee < minimumFee;
    return {
      feeAmount: toMoney(Math.max(percentFee, minimumFee)),
      details: {
        method: 'credit_card',
        mdrPercent,
        rrPercent,
        totalPercent,
        minimumFee,
        usedMinimumFee
      }
    };
  }

  return {
    feeAmount: 0,
    details: {
      method: method || 'other',
      mdrPercent: 0,
      rrPercent: 0,
      totalPercent: 0,
      minimumFee: 0,
      usedMinimumFee: false
    }
  };
}

function getPaymentRegistrationId(payment) {
  if (!payment) return null;
  return payment.registrationId || payment.registration?.id || null;
}

function getRegistrationTicketAmount(registration) {
  if (!registration) return 0;
  const originalPrice = toMoney(registration.originalPrice || 0);
  const discountAmount = toMoney(registration.discountAmount || 0);
  return toMoney(Math.max(originalPrice - discountAmount, 0));
}

function buildTotalPaidByRegistration(payments = []) {
  return payments.reduce((acc, payment) => {
    const registrationId = getPaymentRegistrationId(payment);
    if (!registrationId) return acc;
    const currentTotal = Number(acc[registrationId] || 0);
    acc[registrationId] = toMoney(currentTotal + toMoney(payment.amount));
    return acc;
  }, {});
}

function calculateCustomerFeeAmount({ grossAmount, registrationTicketAmount, totalPaidByRegistration }) {
  const normalizedGrossAmount = toMoney(grossAmount);
  const normalizedRegistrationTicketAmount = toMoney(registrationTicketAmount);
  const normalizedTotalPaidByRegistration = toMoney(totalPaidByRegistration);

  if (normalizedGrossAmount <= 0 || normalizedTotalPaidByRegistration <= 0) {
    return {
      customerFeeAmount: 0,
      ticketAmountPortion: 0
    };
  }

  const cappedTicketAmount = toMoney(Math.min(normalizedRegistrationTicketAmount, normalizedTotalPaidByRegistration));
  const ticketAmountPortion = toMoney((cappedTicketAmount * normalizedGrossAmount) / normalizedTotalPaidByRegistration);
  const customerFeeAmount = toMoney(Math.max(normalizedGrossAmount - ticketAmountPortion, 0));

  return {
    customerFeeAmount,
    ticketAmountPortion
  };
}

function normalizeFeeConfigPayload(payload = {}) {
  const parsed = {
    pixPercent: Number(payload.pixPercent || 0),
    pixFixedFee: toMoney(payload.pixFixedFee || 0),
    creditCardDefaultPercent: Number(payload.creditCardDefaultPercent || 0),
    creditCardFixedFee: toMoney(payload.creditCardFixedFee || 0),
    creditCardInstallmentPercent: normalizeInstallmentPercent(payload.creditCardInstallmentPercent),
    creditCardBrandRates: normalizeCreditCardBrandRates(payload.creditCardBrandRates)
  };

  if (
    !Number.isFinite(parsed.pixPercent)
    || parsed.pixPercent < 0
    || !Number.isFinite(parsed.pixFixedFee)
    || parsed.pixFixedFee < 0
    || !Number.isFinite(parsed.creditCardDefaultPercent)
    || parsed.creditCardDefaultPercent < 0
    || !Number.isFinite(parsed.creditCardFixedFee)
    || parsed.creditCardFixedFee < 0
  ) {
    throw new Error('Configuração de taxa inválida');
  }

  return parsed;
}

async function normalizeExpensePayload(payload = {}) {
  const description = String(payload.description || '').trim();
  if (!description) {
    throw new Error('Descricao e obrigatoria');
  }

  const eventId = normalizeOptionalValue(payload.eventId);
  if (!eventId) {
    throw new Error('Evento e obrigatorio');
  }

  const event = await Event.findByPk(eventId, { attributes: ['id'] });
  if (!event) {
    throw new Error('Evento invalido para a saida');
  }

  const notes = payload.notes ? String(payload.notes).trim() : null;
  const supplier = payload.supplier ? String(payload.supplier).trim() : null;
  const receiptUrl = payload.receiptUrl ? String(payload.receiptUrl).trim() : null;
  const paymentType = payload.paymentType === 'com_entrada' ? 'com_entrada' : 'unico';

  if (paymentType === 'com_entrada') {
    const entradaAmount = toMoney(payload.entradaAmount);
    if (entradaAmount <= 0) {
      throw new Error('Valor da entrada deve ser maior que zero');
    }

    const quitacaoAmount = toMoney(payload.quitacaoAmount);
    if (quitacaoAmount <= 0) {
      throw new Error('Valor da quitacao deve ser maior que zero');
    }

    const entradaPaymentMethod = String(payload.entradaPaymentMethod || '').trim() || 'pix';
    if (!ALLOWED_PAYMENT_METHODS.includes(entradaPaymentMethod)) {
      throw new Error('Forma de pagamento da entrada invalida');
    }

    const quitacaoPaymentMethod = String(payload.quitacaoPaymentMethod || '').trim() || 'pix';
    if (!ALLOWED_PAYMENT_METHODS.includes(quitacaoPaymentMethod)) {
      throw new Error('Forma de pagamento da quitacao invalida');
    }

    const entradaDate = payload.entradaDate || todayDateOnly();
    const parsedEntradaDate = parseDateOnly(entradaDate);
    if (!parsedEntradaDate) {
      throw new Error('Data da entrada invalida');
    }

    const quitacaoDate = payload.quitacaoDate || todayDateOnly();
    const parsedQuitacaoDate = parseDateOnly(quitacaoDate);
    if (!parsedQuitacaoDate) {
      throw new Error('Data da quitacao invalida');
    }

    const entradaIsSettled = Boolean(payload.entradaIsSettled);
    const quitacaoIsSettled = Boolean(payload.quitacaoIsSettled);
    const isSettled = entradaIsSettled && quitacaoIsSettled;
    const totalAmount = toMoney(entradaAmount + quitacaoAmount);

    return {
      description,
      eventId,
      notes,
      paymentType: 'com_entrada',
      amount: totalAmount,
      paymentMethod: entradaPaymentMethod,
      expenseDate: parsedEntradaDate.format('YYYY-MM-DD'),
      isSettled,
      settledAt: isSettled ? now() : null,
      entradaAmount,
      entradaPaymentMethod,
      entradaDate: parsedEntradaDate.format('YYYY-MM-DD'),
      entradaIsSettled,
      entradaSettledAt: entradaIsSettled ? now() : null,
      quitacaoAmount,
      quitacaoPaymentMethod,
      quitacaoDate: parsedQuitacaoDate.format('YYYY-MM-DD'),
      quitacaoIsSettled,
      quitacaoSettledAt: quitacaoIsSettled ? now() : null,
      supplier,
      receiptUrl
    };
  }

  // pagamento unico
  const amount = toMoney(payload.amount);
  if (amount <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }

  const paymentMethod = String(payload.paymentMethod || '').trim() || 'pix';
  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error('Forma de pagamento invalida');
  }

  let { expenseDate } = payload;
  if (!expenseDate) {
    expenseDate = todayDateOnly();
  }

  const parsedExpenseDate = parseDateOnly(expenseDate);
  if (!parsedExpenseDate) {
    throw new Error('Data da saida invalida');
  }

  const isSettled = Boolean(payload.isSettled);

  return {
    description,
    amount,
    eventId,
    paymentMethod,
    isSettled,
    expenseDate: parsedExpenseDate.format('YYYY-MM-DD'),
    settledAt: isSettled ? now() : null,
    notes,
    paymentType: 'unico',
    entradaAmount: null,
    entradaPaymentMethod: null,
    entradaDate: null,
    entradaIsSettled: false,
    entradaSettledAt: null,
    quitacaoAmount: null,
    quitacaoPaymentMethod: null,
    quitacaoDate: null,
    quitacaoIsSettled: false,
    quitacaoSettledAt: null,
    supplier,
    receiptUrl
  };
}

async function listFinancialRecords(filters = {}) {
  const feeConfigModel = await getActiveFeeConfig();
  const feeConfig = serializeFeeConfig(feeConfigModel);
  const page = Math.max(Number(filters.page) || 1, 1);
  const perPage = Math.min(Math.max(Number(filters.perPage) || 10, 1), 100);
  const offset = (page - 1) * perPage;
  const expensePage = Math.max(Number(filters.expensePage) || 1, 1);
  const expensePerPage = Math.min(Math.max(Number(filters.expensePerPage) || 10, 1), 100);
  const expenseOffset = (expensePage - 1) * expensePerPage;
  const manualEntryPage = Math.max(Number(filters.manualEntryPage) || 1, 1);
  const manualEntryPerPage = Math.min(Math.max(Number(filters.manualEntryPerPage) || 10, 1), 100);
  const manualEntryOffset = (manualEntryPage - 1) * manualEntryPerPage;
  const paymentDateFilter = buildDateRange('createdAt', filters.dateFrom, filters.dateTo, { dateOnly: false });

  // filtros específicos de saídas (se fornecidos, substituem os globais para expenses)
  const expDateFrom = normalizeOptionalValue(filters.expenseDateFrom) || filters.dateFrom;
  const expDateTo = normalizeOptionalValue(filters.expenseDateTo) || filters.dateTo;
  const expenseDateFilter = buildDateRange('expenseDate', expDateFrom, expDateTo, { dateOnly: true });

  // filtros específicos de entradas manuais
  const manualEntryDateFrom = normalizeOptionalValue(filters.manualEntryDateFrom) || filters.dateFrom;
  const manualEntryDateTo = normalizeOptionalValue(filters.manualEntryDateTo) || filters.dateTo;
  const manualEntryDateFilter = buildDateRange('entryDate', manualEntryDateFrom, manualEntryDateTo, { dateOnly: true });

  const registrationWhere = {};
  const normalizedEventId = normalizeOptionalValue(filters.eventId);
  const shouldRestrictTicketEvents = !normalizedEventId;
  const unfinishedEvents = shouldRestrictTicketEvents
    || !normalizeOptionalValue(filters.expenseEventId)
    || !normalizeOptionalValue(filters.manualEntryEventId)
    ? await Event.findAll({
      where: buildUnfinishedEventWhere(),
      attributes: ['id'],
      raw: true
    })
    : [];
  const unfinishedEventIds = unfinishedEvents.map(event => event.id);
  if (normalizedEventId) {
    registrationWhere.eventId = normalizedEventId;
  } else {
    registrationWhere.eventId = unfinishedEventIds.length ? { [Op.in]: unfinishedEventIds } : null;
  }
  const normalizedPaymentMethod = normalizeOptionalValue(filters.paymentMethod);
  const normalizedExpenseEventId = normalizeOptionalValue(filters.expenseEventId) || normalizedEventId;
  const normalizedManualEntryEventId = normalizeOptionalValue(filters.manualEntryEventId) || normalizedEventId;

  const summaryPaymentWhere = {
    status: 'confirmed',
    ...paymentDateFilter
  };
  const entriesPaymentWhere = {
    status: { [Op.in]: ACTIVE_FINANCIAL_ENTRY_STATUSES },
    ...paymentDateFilter
  };
  const expenseWhere = {
    ...expenseDateFilter
  };

  const manualEntryWhere = {
    ...manualEntryDateFilter
  };

  if (normalizedPaymentMethod && ALLOWED_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
    summaryPaymentWhere.method = normalizedPaymentMethod;
    entriesPaymentWhere.method = normalizedPaymentMethod;
    expenseWhere.paymentMethod = normalizedPaymentMethod;
    manualEntryWhere.paymentMethod = normalizedPaymentMethod;
  }
  if (normalizedExpenseEventId) {
    expenseWhere.eventId = normalizedExpenseEventId;
  } else {
    expenseWhere.eventId = unfinishedEventIds.length ? { [Op.in]: unfinishedEventIds } : null;
  }
  if (normalizedManualEntryEventId) {
    manualEntryWhere.eventId = normalizedManualEntryEventId;
  } else {
    manualEntryWhere[Op.or] = [
      { eventId: null },
      { eventId: unfinishedEventIds.length ? { [Op.in]: unfinishedEventIds } : null }
    ];
  }
  const expenseIsSettled = normalizeOptionalValue(filters.expenseIsSettled);
  if (expenseIsSettled === 'true') expenseWhere.isSettled = true;
  else if (expenseIsSettled === 'false') expenseWhere.isSettled = false;

  const manualEntryIsSettled = normalizeOptionalValue(filters.manualEntryIsSettled);
  if (manualEntryIsSettled === 'true') manualEntryWhere.isSettled = true;
  else if (manualEntryIsSettled === 'false') manualEntryWhere.isSettled = false;

  // Usado para o resumo financeiro total (não paginado)
  const paymentsForSummary = await RegistrationPayment.findAll({
    where: summaryPaymentWhere,
    attributes: ['amount', 'provider', 'method', 'installments', 'cardBrand', 'providerPayload'],
    include: [
      {
        model: Registration,
        as: 'registration',
        attributes: ['id', 'eventId', 'originalPrice', 'discountAmount'],
        where: registrationWhere,
        required: true
      }
    ]
  });

  // Lista paginada de entradas de tickets
  const paginatedPayments = await RegistrationPayment.findAndCountAll({
    where: {
      ...entriesPaymentWhere
    },
    include: [
      {
        model: Registration,
        as: 'registration',
        attributes: ['id', 'orderCode', 'eventId', 'originalPrice', 'discountAmount'],
        where: registrationWhere,
        required: true,
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'title']
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: perPage,
    offset,
    distinct: true
  });

  const entryTotalsByRegistrationRows = await RegistrationPayment.findAll({
    where: {
      ...entriesPaymentWhere
    },
    attributes: [
      'registrationId',
      [RegistrationPayment.sequelize.fn('SUM', RegistrationPayment.sequelize.col('amount')), 'totalPaid']
    ],
    include: [
      {
        model: Registration,
        as: 'registration',
        attributes: [],
        where: registrationWhere,
        required: true
      }
    ],
    group: ['RegistrationPayment.registrationId'],
    raw: true
  });

  const entryTotalPaidByRegistration = entryTotalsByRegistrationRows.reduce((acc, row) => {
    const registrationId = normalizeOptionalValue(row.registrationId);
    if (!registrationId) return acc;
    acc[registrationId] = toMoney(row.totalPaid || 0);
    return acc;
  }, {});

  const ticketEntries = paginatedPayments.rows.map((payment) => {
    const registrationId = getPaymentRegistrationId(payment);
    const grossAmount = toMoney(payment.amount);
    const registrationTicketAmount = getRegistrationTicketAmount(payment.registration);
    const totalPaidByRegistration = toMoney(entryTotalPaidByRegistration[registrationId] || grossAmount);
    const feeResult = calculateConfiguredFee(payment, feeConfig);
    const feeAmount = toMoney(feeResult.feeAmount);
    const { customerFeeAmount, ticketAmountPortion } = calculateCustomerFeeAmount({
      grossAmount,
      registrationTicketAmount,
      totalPaidByRegistration
    });
    const merchantFeeAmount = toMoney(feeAmount - customerFeeAmount);
    const netAmount = toMoney(grossAmount - feeAmount);

    return {
      id: payment.id,
      registrationId,
      orderCode: payment.registration?.orderCode || '-',
      eventId: payment.registration?.event?.id || null,
      eventTitle: payment.registration?.event?.title || '-',
      paymentMethod: payment.method,
      paymentStatus: payment.status,
      provider: payment.provider || null,
      installments: payment.installments || null,
      cardBrand: payment.cardBrand || paymentService.extrairBandeiraCartao(payment.providerPayload),
      grossAmount,
      ticketAmountPortion,
      feeAmount,
      customerFeeAmount,
      merchantFeeAmount,
      feeDetails: feeResult.details,
      netAmount,
      createdAt: payment.createdAt
    };
  });

  const expensesForSummary = await FinancialExpense.findAll({
    where: expenseWhere,
    attributes: ['id', 'amount', 'isSettled', 'paymentType', 'entradaAmount', 'entradaIsSettled', 'quitacaoAmount', 'quitacaoIsSettled'],
    order: [['expenseDate', 'DESC'], ['createdAt', 'DESC']]
  });

  const manualEntriesForSummary = await FinancialManualEntry.findAll({
    where: manualEntryWhere,
    attributes: ['id', 'amount', 'isSettled']
  });

  const paginatedManualEntries = await FinancialManualEntry.findAndCountAll({
    where: manualEntryWhere,
    include: [
      { model: Event, as: 'event', attributes: ['id', 'title'] },
      { model: User, as: 'creator', attributes: ['id', 'name'] },
      { model: User, as: 'updater', attributes: ['id', 'name'] }
    ],
    order: [['entryDate', 'DESC'], ['createdAt', 'DESC']],
    limit: manualEntryPerPage,
    offset: manualEntryOffset,
    distinct: true
  });

  const normalizedManualEntries = paginatedManualEntries.rows.map((entry) => ({
    id: entry.id,
    eventId: entry.eventId || null,
    eventTitle: entry.event?.title || '-',
    description: entry.description,
    amount: toMoney(entry.amount),
    paymentMethod: entry.paymentMethod,
    isSettled: Boolean(entry.isSettled),
    entryDate: entry.entryDate,
    settledAt: entry.settledAt,
    notes: entry.notes,
    receiptUrl: entry.receiptUrl || null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    createdBy: entry.creator ? { id: entry.creator.id, name: entry.creator.name } : null,
    updatedBy: entry.updater ? { id: entry.updater.id, name: entry.updater.name } : null
  }));

  const paginatedExpenses = await FinancialExpense.findAndCountAll({
    where: expenseWhere,
    include: [
      { model: Event, as: 'event', attributes: ['id', 'title'] },
      { model: User, as: 'creator', attributes: ['id', 'name'] },
      { model: User, as: 'updater', attributes: ['id', 'name'] }
    ],
    order: [['expenseDate', 'DESC'], ['createdAt', 'DESC']],
    limit: expensePerPage,
    offset: expenseOffset,
    distinct: true
  });

  const normalizedExpenses = paginatedExpenses.rows.map((expense) => ({
    id: expense.id,
    eventId: expense.eventId || null,
    eventTitle: expense.event?.title || '-',
    description: expense.description,
    amount: toMoney(expense.amount),
    paymentMethod: expense.paymentMethod,
    isSettled: Boolean(expense.isSettled),
    expenseDate: expense.expenseDate,
    settledAt: expense.settledAt,
    notes: expense.notes,
    paymentType: expense.paymentType || 'unico',
    entradaAmount: expense.entradaAmount != null ? toMoney(expense.entradaAmount) : null,
    entradaPaymentMethod: expense.entradaPaymentMethod || null,
    entradaDate: expense.entradaDate || null,
    entradaIsSettled: Boolean(expense.entradaIsSettled),
    entradaSettledAt: expense.entradaSettledAt || null,
    quitacaoAmount: expense.quitacaoAmount != null ? toMoney(expense.quitacaoAmount) : null,
    quitacaoPaymentMethod: expense.quitacaoPaymentMethod || null,
    quitacaoDate: expense.quitacaoDate || null,
    quitacaoIsSettled: Boolean(expense.quitacaoIsSettled),
    quitacaoSettledAt: expense.quitacaoSettledAt || null,
    supplier: expense.supplier || null,
    receiptUrl: expense.receiptUrl || null,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    createdBy: expense.creator ? { id: expense.creator.id, name: expense.creator.name } : null,
    updatedBy: expense.updater ? { id: expense.updater.id, name: expense.updater.name } : null
  }));

  const summaryTotalPaidByRegistration = buildTotalPaidByRegistration(paymentsForSummary);

  const totals = paymentsForSummary.reduce((acc, payment) => {
    const registrationId = getPaymentRegistrationId(payment);
    const grossAmount = toMoney(payment.amount);
    const registrationTicketAmount = getRegistrationTicketAmount(payment.registration);
    const totalPaidByRegistration = toMoney(summaryTotalPaidByRegistration[registrationId] || grossAmount);
    const feeResult = calculateConfiguredFee(payment, feeConfig);
    const feeAmount = toMoney(feeResult.feeAmount);
    const { customerFeeAmount } = calculateCustomerFeeAmount({
      grossAmount,
      registrationTicketAmount,
      totalPaidByRegistration
    });
    const merchantFeeAmount = toMoney(feeAmount - customerFeeAmount);
    acc.ticketGross += grossAmount;
    acc.totalFees += merchantFeeAmount;
    acc.customerFees += customerFeeAmount;
    acc.processorFees += feeAmount;
    return acc;
  }, {
    ticketGross: 0,
    totalFees: 0,
    customerFees: 0,
    processorFees: 0
  });

  const ticketGrossTotal = toMoney(totals.ticketGross);
  const totalFees = toMoney(totals.totalFees);
  const customerFees = toMoney(totals.customerFees);
  const processorFees = toMoney(totals.processorFees);
  const ticketNet = toMoney(ticketGrossTotal - processorFees);

  const expenseTotals = expensesForSummary.reduce((acc, expense) => {
    if (expense.paymentType === 'com_entrada') {
      const ea = toMoney(expense.entradaAmount || 0);
      const qa = toMoney(expense.quitacaoAmount || 0);
      acc.expensesSettled += expense.entradaIsSettled ? ea : 0;
      acc.expensesSettled += expense.quitacaoIsSettled ? qa : 0;
      acc.expensesPending += expense.entradaIsSettled ? 0 : ea;
      acc.expensesPending += expense.quitacaoIsSettled ? 0 : qa;
      acc.expensesTotal += ea + qa;
    } else {
      const amount = toMoney(expense.amount);
      if (expense.isSettled) {
        acc.expensesSettled += amount;
      } else {
        acc.expensesPending += amount;
      }
      acc.expensesTotal += amount;
    }
    return acc;
  }, {
    expensesSettled: 0,
    expensesPending: 0,
    expensesTotal: 0
  });

  const manualEntryTotals = manualEntriesForSummary.reduce((acc, entry) => {
    const amount = toMoney(entry.amount);
    if (entry.isSettled) {
      acc.settled += amount;
    } else {
      acc.pending += amount;
    }
    acc.total += amount;
    return acc;
  }, { settled: 0, pending: 0, total: 0 });

  const totalIncome = toMoney(ticketNet + manualEntryTotals.settled);

  return {
    summary: {
      ticketGross: ticketGrossTotal,
      totalFees,
      customerFees,
      processorFees,
      ticketNet,
      manualEntriesSettled: toMoney(manualEntryTotals.settled),
      manualEntriesPending: toMoney(manualEntryTotals.pending),
      manualEntriesTotal: toMoney(manualEntryTotals.total),
      totalNet: toMoney(totalIncome),
      expensesSettled: toMoney(expenseTotals.expensesSettled),
      expensesPending: toMoney(expenseTotals.expensesPending),
      expensesTotal: toMoney(expenseTotals.expensesTotal),
      balance: toMoney(totalIncome - expenseTotals.expensesSettled)
    },
    entries: ticketEntries,
    entriesPagination: {
      page,
      perPage,
      total: Number(paginatedPayments.count || 0),
      totalPages: Math.ceil(Number(paginatedPayments.count || 0) / perPage)
    },
    manualEntries: normalizedManualEntries,
    manualEntriesPagination: {
      page: manualEntryPage,
      perPage: manualEntryPerPage,
      total: Number(paginatedManualEntries.count || 0),
      totalPages: Math.ceil(Number(paginatedManualEntries.count || 0) / manualEntryPerPage)
    },
    expensesPagination: {
      page: expensePage,
      perPage: expensePerPage,
      total: Number(paginatedExpenses.count || 0),
      totalPages: Math.ceil(Number(paginatedExpenses.count || 0) / expensePerPage)
    },
    feeConfig,
    expenses: normalizedExpenses
  };
}

async function getFeeConfig() {
  const config = await getActiveFeeConfig();
  return serializeFeeConfig(config);
}

async function updateFeeConfig(payload = {}, userId = null) {
  const config = await getActiveFeeConfig();
  if (config?._isFallback) {
    throw new Error('Tabela de configuração de taxas não encontrada. Execute as migrations pendentes.');
  }
  const normalizedPayload = normalizeFeeConfigPayload(payload);
  await config.update({
    ...normalizedPayload,
    updatedBy: userId
  });
  return serializeFeeConfig(config);
}

async function createExpense(payload = {}, userId = null) {
  const normalized = await normalizeExpensePayload(payload);
  const expense = await FinancialExpense.create({
    ...normalized,
    createdBy: userId,
    updatedBy: userId
  });
  return expense;
}

async function updateExpense(id, payload = {}, userId = null) {
  const expense = await FinancialExpense.findByPk(id);
  if (!expense) {
    throw new Error('Saída não encontrada');
  }

  const normalized = await normalizeExpensePayload(payload);
  await expense.update({
    ...normalized,
    updatedBy: userId
  });

  return expense;
}

async function deleteExpense(id) {
  const expense = await FinancialExpense.findByPk(id);
  if (!expense) {
    throw new Error('Saída não encontrada');
  }
  await expense.destroy();
}

async function getExpensesForExport(filters = {}) {
  const expDateFrom = normalizeOptionalValue(filters.expenseDateFrom);
  const expDateTo = normalizeOptionalValue(filters.expenseDateTo);
  const expenseDateFilter = buildDateRange('expenseDate', expDateFrom, expDateTo, { dateOnly: true });

  const where = { ...expenseDateFilter };

  const normalizedEventId = normalizeOptionalValue(filters.expenseEventId);
  if (normalizedEventId) where.eventId = normalizedEventId;

  const isSettled = normalizeOptionalValue(filters.expenseIsSettled);
  if (isSettled === 'true') where.isSettled = true;
  else if (isSettled === 'false') where.isSettled = false;

  const expenses = await FinancialExpense.findAll({
    where,
    include: [
      { model: Event, as: 'event', attributes: ['id', 'title'] },
      { model: User, as: 'creator', attributes: ['id', 'name'] }
    ],
    order: [['expenseDate', 'ASC'], ['createdAt', 'ASC']]
  });

  return expenses.map((e) => ({
    id: e.id,
    eventTitle: e.event?.title || '-',
    description: e.description,
    paymentType: e.paymentType || 'unico',
    amount: toMoney(e.amount),
    paymentMethod: e.paymentMethod,
    isSettled: Boolean(e.isSettled),
    expenseDate: e.expenseDate,
    entradaAmount: e.entradaAmount != null ? toMoney(e.entradaAmount) : null,
    entradaPaymentMethod: e.entradaPaymentMethod || null,
    entradaDate: e.entradaDate || null,
    entradaIsSettled: Boolean(e.entradaIsSettled),
    quitacaoAmount: e.quitacaoAmount != null ? toMoney(e.quitacaoAmount) : null,
    quitacaoPaymentMethod: e.quitacaoPaymentMethod || null,
    quitacaoDate: e.quitacaoDate || null,
    quitacaoIsSettled: Boolean(e.quitacaoIsSettled),
    supplier: e.supplier || '',
    notes: e.notes || '',
    receiptUrl: e.receiptUrl || null,
    createdBy: e.creator?.name || '-',
    createdAt: e.createdAt
  }));
}

async function normalizeManualEntryPayload(payload = {}) {
  const description = String(payload.description || '').trim();
  if (!description) {
    throw new Error('Descricao e obrigatoria');
  }

  const amount = toMoney(payload.amount);
  if (amount <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }

  const eventId = normalizeOptionalValue(payload.eventId) || null;
  if (eventId) {
    const event = await Event.findByPk(eventId, { attributes: ['id'] });
    if (!event) {
      throw new Error('Evento invalido para a entrada');
    }
  }

  const paymentMethod = String(payload.paymentMethod || '').trim() || 'pix';
  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error('Forma de pagamento invalida');
  }

  let { entryDate } = payload;
  if (!entryDate) {
    entryDate = todayDateOnly();
  }
  const parsedEntryDate = parseDateOnly(entryDate);
  if (!parsedEntryDate) {
    throw new Error('Data da entrada invalida');
  }

  const isSettled = Boolean(payload.isSettled);
  const notes = payload.notes ? String(payload.notes).trim() : null;
  const receiptUrl = payload.receiptUrl ? String(payload.receiptUrl).trim() : null;

  return {
    description,
    amount,
    eventId,
    paymentMethod,
    isSettled,
    entryDate: parsedEntryDate.format('YYYY-MM-DD'),
    settledAt: isSettled ? now() : null,
    notes,
    receiptUrl
  };
}

async function createManualEntry(payload = {}, userId = null) {
  const normalized = await normalizeManualEntryPayload(payload);
  const entry = await FinancialManualEntry.create({
    ...normalized,
    createdBy: userId,
    updatedBy: userId
  });
  return entry;
}

async function updateManualEntry(id, payload = {}, userId = null) {
  const entry = await FinancialManualEntry.findByPk(id);
  if (!entry) {
    throw new Error('Entrada manual nao encontrada');
  }
  const normalized = await normalizeManualEntryPayload(payload);
  await entry.update({
    ...normalized,
    updatedBy: userId
  });
  return entry;
}

async function deleteManualEntry(id) {
  const entry = await FinancialManualEntry.findByPk(id);
  if (!entry) {
    throw new Error('Entrada manual nao encontrada');
  }
  await entry.destroy();
}

module.exports = {
  listFinancialRecords,
  getExpensesForExport,
  getFeeConfig,
  updateFeeConfig,
  createExpense,
  updateExpense,
  deleteExpense,
  createManualEntry,
  updateManualEntry,
  deleteManualEntry
};
