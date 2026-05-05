/* eslint-disable no-console */
const { Op } = require('sequelize');
const { sequelize, Registration } = require('../models');

const isDryRun = process.argv.includes('--dry-run');

function buildEventLog(paymentStatus) {
  const now = new Date().toISOString();
  return {
    [`registration.updated:null:${paymentStatus}`]: {
      previousStatus: null,
      currentStatus: paymentStatus,
      sentAt: now
    }
  };
}

async function run() {
  const registrations = await Registration.findAll({
    where: {
      webhookEventLog: { [Op.is]: null }
    },
    attributes: ['id', 'orderCode', 'paymentStatus'],
    order: [['createdAt', 'ASC']]
  });

  console.log(`Registrations sem webhookEventLog: ${registrations.length}`);
  if (!registrations.length) return;
  if (isDryRun) {
    console.log('Dry-run ativo. Nenhuma atualização será aplicada.');
  }

  let updated = 0;

  for (const registration of registrations) {
    const webhookEventLog = buildEventLog(registration.paymentStatus);

    if (isDryRun) {
      console.log(`  ${registration.orderCode} (${registration.paymentStatus}) →`, JSON.stringify(webhookEventLog));
    } else {
      await registration.update({ webhookEventLog });
    }

    updated += 1;
  }

  console.log(`Atualizados: ${updated}`);
}

run()
  .catch((error) => {
    console.error('Erro no backfill de webhookEventLog:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
