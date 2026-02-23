/* eslint-disable no-console */
const { Op } = require('sequelize');
const {
  sequelize,
  RegistrationPayment,
  PaymentTransaction
} = require('../models');
const paymentService = require('../services/paymentService');

const isDryRun = process.argv.includes('--dry-run');

async function findBrandFromTransactions(payment) {
  if (payment.providerPaymentId) {
    const transactionByPaymentId = await PaymentTransaction.findOne({
      where: {
        cieloPaymentId: payment.providerPaymentId,
        responseData: { [Op.ne]: null }
      },
      order: [['createdAt', 'DESC']]
    });
    if (transactionByPaymentId?.responseData) {
      const brandFromPaymentId = paymentService.extrairBandeiraCartao(transactionByPaymentId.responseData);
      if (brandFromPaymentId) {
        return brandFromPaymentId;
      }
    }
  }

  const transactionByRegistration = await PaymentTransaction.findOne({
    where: {
      registrationId: payment.registrationId,
      responseData: { [Op.ne]: null }
    },
    order: [['createdAt', 'DESC']]
  });

  if (!transactionByRegistration?.responseData) {
    return null;
  }

  return paymentService.extrairBandeiraCartao(transactionByRegistration.responseData);
}

async function run() {
  const payments = await RegistrationPayment.findAll({
    where: {
      method: 'credit_card',
      [Op.or]: [
        { cardBrand: null },
        { cardBrand: '' }
      ]
    },
    order: [['createdAt', 'ASC']]
  });

  console.log(`RegistrationPayments de cartão sem bandeira: ${payments.length}`);
  if (!payments.length) return;
  if (isDryRun) {
    console.log('Dry-run ativo. Nenhuma atualização será aplicada.');
  }

  let updated = 0;
  let skipped = 0;

  for (const payment of payments) {
    const brandFromPayload = paymentService.extrairBandeiraCartao(payment.providerPayload);
    const brandFromTransaction = brandFromPayload || await findBrandFromTransactions(payment);
    const finalBrand = paymentService.normalizeCardBrand(brandFromTransaction);

    if (!finalBrand) {
      skipped += 1;
      continue;
    }

    if (!isDryRun) {
      await payment.update({ cardBrand: finalBrand });
    }
    updated += 1;
  }

  console.log(`Atualizados: ${updated}`);
  console.log(`Sem bandeira encontrada: ${skipped}`);
}

run()
  .catch((error) => {
    console.error('Erro no backfill de bandeira:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
