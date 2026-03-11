/* eslint-disable no-console */
const { Op } = require('sequelize');
const {
  sequelize,
  Registration,
  RegistrationPayment
} = require('../models');
const paymentService = require('../services/paymentService');

const isDryRun = process.argv.includes('--dry-run');

function isBlank(value) {
  return value === null || value === undefined || value === '';
}

function buildPixIdentifierUpdate(current, extracted) {
  const update = {};

  if (isBlank(current.pixTransactionId) && extracted.txid) {
    update.pixTransactionId = extracted.txid;
  }

  if (isBlank(current.pixEndToEndId) && extracted.endToEndId) {
    update.pixEndToEndId = extracted.endToEndId;
  }

  return update;
}

function selectBestPixPayment(registration, payments) {
  if (!payments.length) {
    return null;
  }

  if (registration.paymentId) {
    const matchedByPaymentId = payments.find((payment) => payment.providerPaymentId === registration.paymentId);
    if (matchedByPaymentId) {
      return matchedByPaymentId;
    }
  }

  const withIdentifiers = payments.filter((payment) => payment.pixTransactionId || payment.pixEndToEndId);
  if (withIdentifiers.length) {
    return withIdentifiers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }

  return payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

async function backfillRegistrationPayments() {
  const payments = await RegistrationPayment.findAll({
    where: {
      method: 'pix',
      providerPayload: { [Op.ne]: null },
      [Op.or]: [
        { pixTransactionId: null },
        { pixTransactionId: '' },
        { pixEndToEndId: null },
        { pixEndToEndId: '' }
      ]
    },
    order: [['createdAt', 'ASC']]
  });

  console.log(`Pagamentos Pix candidatos ao backfill: ${payments.length}`);
  if (!payments.length) {
    return { updated: 0, skipped: 0 };
  }

  let updated = 0;
  let skipped = 0;

  for (const payment of payments) {
    const extracted = paymentService.extrairPixIdentifiers(payment.providerPayload);
    const update = buildPixIdentifierUpdate(payment, extracted);

    if (!Object.keys(update).length) {
      skipped += 1;
      continue;
    }

    if (!isDryRun) {
      await payment.update(update);
    }

    updated += 1;
  }

  return { updated, skipped };
}

async function backfillRegistrations() {
  const registrations = await Registration.findAll({
    where: {
      [Op.or]: [
        { pixTransactionId: null },
        { pixTransactionId: '' },
        { pixEndToEndId: null },
        { pixEndToEndId: '' }
      ]
    },
    include: [
      {
        model: RegistrationPayment,
        as: 'payments',
        required: true,
        where: {
          method: 'pix',
          providerPayload: { [Op.ne]: null }
        },
        attributes: [
          'id',
          'providerPaymentId',
          'pixTransactionId',
          'pixEndToEndId',
          'providerPayload',
          'createdAt'
        ]
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  console.log(`Inscricoes com Pix candidatas ao backfill: ${registrations.length}`);
  if (!registrations.length) {
    return { updated: 0, skipped: 0 };
  }

  let updated = 0;
  let skipped = 0;

  for (const registration of registrations) {
    const payments = registration.payments
      .map((payment) => {
        if (payment.pixTransactionId || payment.pixEndToEndId) {
          return payment;
        }

        const extracted = paymentService.extrairPixIdentifiers(payment.providerPayload);
        if (!extracted.txid && !extracted.endToEndId) {
          return payment;
        }

        payment.pixTransactionId = payment.pixTransactionId || extracted.txid || null;
        payment.pixEndToEndId = payment.pixEndToEndId || extracted.endToEndId || null;
        return payment;
      });

    const selectedPayment = selectBestPixPayment(registration, payments);
    if (!selectedPayment) {
      skipped += 1;
      continue;
    }

    const update = buildPixIdentifierUpdate(registration, {
      txid: selectedPayment.pixTransactionId,
      endToEndId: selectedPayment.pixEndToEndId
    });

    if (!Object.keys(update).length) {
      skipped += 1;
      continue;
    }

    if (!isDryRun) {
      await registration.update(update);
    }

    updated += 1;
  }

  return { updated, skipped };
}

async function run() {
  if (isDryRun) {
    console.log('Dry-run ativo. Nenhuma atualizacao sera aplicada.');
  }

  const paymentResult = await backfillRegistrationPayments();
  const registrationResult = await backfillRegistrations();

  console.log(`Pagamentos atualizados: ${paymentResult.updated}`);
  console.log(`Pagamentos sem identificadores no payload: ${paymentResult.skipped}`);
  console.log(`Inscricoes atualizadas: ${registrationResult.updated}`);
  console.log(`Inscricoes sem alteracao: ${registrationResult.skipped}`);
}

run()
  .catch((error) => {
    console.error('Erro no backfill de identificadores Pix:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
