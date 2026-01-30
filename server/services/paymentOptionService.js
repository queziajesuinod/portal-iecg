const { Op } = require('sequelize');
const { PaymentOption } = require('../models');

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
  const { paymentType, maxInstallments, interestRate, interestType } = dados;
  
  // Validar se já existe essa forma de pagamento para o evento
  const existente = await PaymentOption.findOne({
    where: { eventId, paymentType }
  });
  
  if (existente) {
    throw new Error(`Forma de pagamento ${paymentType} já existe para este evento`);
  }
  
  const isOffline = paymentType === 'offline';

  return PaymentOption.create({
    eventId,
    paymentType,
    maxInstallments: isOffline ? 1 : (maxInstallments || 1),
    interestRate: isOffline ? 0 : (interestRate || 0),
    interestType: isOffline ? 'percentage' : (interestType || 'percentage'),
    isActive: true
  });
}

async function atualizar(id, dados) {
  const paymentOption = await PaymentOption.findByPk(id);
  
  if (!paymentOption) {
    throw new Error('Forma de pagamento não encontrada');
  }
  
  paymentOption.maxInstallments = dados.maxInstallments ?? paymentOption.maxInstallments;
  paymentOption.interestRate = dados.interestRate ?? paymentOption.interestRate;
  paymentOption.interestType = dados.interestType ?? paymentOption.interestType;
  paymentOption.isActive = dados.isActive ?? paymentOption.isActive;
  
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
