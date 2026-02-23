/* eslint-disable no-console */
const { Op } = require('sequelize');
const {
  sequelize,
  Registration,
  RegistrationPayment
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');

const REGISTRATION_FINAL_STATUSES = ['cancelled', 'refunded'];
const PAYMENT_STATUSES_TO_FIX = ['pending', 'authorized', 'confirmed'];

function resolveTargetPaymentStatus(registrationStatus, paymentStatus) {
  if (registrationStatus === 'refunded' && paymentStatus === 'confirmed') {
    return 'refunded';
  }
  return 'cancelled';
}

async function run() {
  const payments = await RegistrationPayment.findAll({
    where: {
      status: { [Op.in]: PAYMENT_STATUSES_TO_FIX }
    },
    include: [
      {
        model: Registration,
        as: 'registration',
        attributes: ['id', 'orderCode', 'paymentStatus'],
        required: true,
        where: {
          paymentStatus: { [Op.in]: REGISTRATION_FINAL_STATUSES }
        }
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  const affectedRegistrations = new Set(
    payments.map((payment) => payment.registration?.id).filter(Boolean)
  );

  console.log(`Registros cancelados/reembolsados com pagamentos ativos: ${affectedRegistrations.size}`);
  console.log(`Pagamentos candidatos ao backfill: ${payments.length}`);

  if (!payments.length) {
    return;
  }

  if (isDryRun) {
    console.log('Dry-run ativo. Nenhuma atualizacao sera aplicada.');
  }

  let updated = 0;
  let updatedToCancelled = 0;
  let updatedToRefunded = 0;
  let skipped = 0;

  for (const payment of payments) {
    const registrationStatus = payment.registration?.paymentStatus;
    const targetStatus = resolveTargetPaymentStatus(registrationStatus, payment.status);

    if (!targetStatus || payment.status === targetStatus) {
      skipped += 1;
      continue;
    }

    if (!isDryRun) {
      payment.status = targetStatus;
      await payment.save();
    }

    updated += 1;
    if (targetStatus === 'refunded') {
      updatedToRefunded += 1;
    } else {
      updatedToCancelled += 1;
    }
  }

  console.log(`Atualizados: ${updated}`);
  console.log(` -> cancelados: ${updatedToCancelled}`);
  console.log(` -> reembolsados: ${updatedToRefunded}`);
  console.log(`Sem alteracao: ${skipped}`);
}

run()
  .catch((error) => {
    console.error('Erro no backfill de pagamentos cancelados/reembolsados:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
