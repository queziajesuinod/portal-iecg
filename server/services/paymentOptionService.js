const { PaymentOption } = require('../models');

async function listarPorEvento(eventId) {
  const where = { eventId };
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
  
  return PaymentOption.create({
    eventId,
    paymentType,
    maxInstallments: maxInstallments || 1,
    interestRate: interestRate || 0,
    interestType: interestType || 'percentage',
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
