const { Op } = require('sequelize');
const { PaymentOption } = require('../models');

function normalizeInstallmentInterestRates(installmentInterestRates, maxInstallments) {
  if (!installmentInterestRates || typeof installmentInterestRates !== 'object' || Array.isArray(installmentInterestRates)) {
    return {};
  }

  const max = Number(maxInstallments) || 1;
  const normalized = {};

  Object.entries(installmentInterestRates).forEach(([installmentKey, rate]) => {
    const installment = Number(installmentKey);
    const parsedRate = Number(rate);

    if (!Number.isInteger(installment) || installment < 2 || installment > max) {
      return;
    }
    if (!Number.isFinite(parsedRate) || parsedRate < 0) {
      return;
    }

    normalized[String(installment)] = Number(parsedRate.toFixed(2));
  });

  return normalized;
}

function buildPaymentOptionPayload(dados = {}, current = null) {
  const paymentType = dados.paymentType ?? current?.paymentType;
  const isCreditCard = paymentType === 'credit_card';

  const maxInstallmentsValue = Number(dados.maxInstallments ?? current?.maxInstallments ?? 1);
  const maxInstallments = Number.isInteger(maxInstallmentsValue) && maxInstallmentsValue > 0
    ? maxInstallmentsValue
    : 1;

  const interestRateValue = Number(dados.interestRate ?? current?.interestRate ?? 0);
  const interestRate = Number.isFinite(interestRateValue) && interestRateValue >= 0
    ? Number(interestRateValue.toFixed(2))
    : 0;

  const interestType = dados.interestType ?? current?.interestType ?? 'percentage';
  const rawInstallments = dados.installmentInterestRates ?? current?.installmentInterestRates;
  const installmentInterestRates = isCreditCard
    ? normalizeInstallmentInterestRates(rawInstallments, maxInstallments)
    : {};
  const sanitizedInterestType = interestType === 'fixed' ? 'fixed' : 'percentage';

  return {
    paymentType,
    maxInstallments: isCreditCard ? maxInstallments : 1,
    interestRate: isCreditCard ? interestRate : 0,
    interestType: isCreditCard ? sanitizedInterestType : 'percentage',
    installmentInterestRates,
    isActive: dados.isActive ?? current?.isActive ?? true
  };
}

async function listarPorEvento(eventId, options = {}) {
  const includeOffline = options.includeOffline ?? true;
  const where = { eventId };
  if (!includeOffline) {
    where.paymentType = { [Op.not]: 'offline' };
  }
  return PaymentOption.findAll({
    where,
    order: [['paymentType', 'ASC']]
  });
}

async function criar(eventId, dados) {
  const { paymentType } = dados;

  // Validar se já existe essa forma de pagamento para o evento
  const existente = await PaymentOption.findOne({
    where: { eventId, paymentType }
  });

  if (existente) {
    throw new Error(`Forma de pagamento ${paymentType} já existe para este evento`);
  }

  const payload = buildPaymentOptionPayload(dados);
  return PaymentOption.create({
    eventId,
    ...payload
  });
}

async function atualizar(id, dados) {
  const paymentOption = await PaymentOption.findByPk(id);

  if (!paymentOption) {
    throw new Error('Forma de pagamento não encontrada');
  }

  const payload = buildPaymentOptionPayload(dados, paymentOption);
  paymentOption.maxInstallments = payload.maxInstallments;
  paymentOption.interestRate = payload.interestRate;
  paymentOption.interestType = payload.interestType;
  paymentOption.installmentInterestRates = payload.installmentInterestRates;
  paymentOption.isActive = payload.isActive;

  await paymentOption.save();
  return paymentOption;
}

async function deletar(id) {
  const paymentOption = await PaymentOption.findByPk(id);

  if (!paymentOption) {
    throw new Error('Forma de pagamento não encontrada');
  }

  await paymentOption.destroy();
}

module.exports = {
  listarPorEvento,
  criar,
  atualizar,
  deletar
};
