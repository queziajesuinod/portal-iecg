/* eslint-disable no-console */
/**
 * Limpa o webhookEventLog de registrations para permitir reenvio dos webhooks.
 *
 * Uso:
 *   node server/scripts/clearWebhookEventLog.js --dry-run
 *   node server/scripts/clearWebhookEventLog.js
 *   node server/scripts/clearWebhookEventLog.js --event <eventId>
 *   node server/scripts/clearWebhookEventLog.js --registration <registrationId>
 */
const { Op } = require('sequelize');
const { sequelize, Registration } = require('../models');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const eventId = getArgValue('--event');
const registrationId = getArgValue('--registration');

async function run() {
  const where = {
    webhookEventLog: { [Op.ne]: null }
  };

  if (registrationId) {
    where.id = registrationId;
  } else if (eventId) {
    where.eventId = eventId;
  }

  const registrations = await Registration.findAll({
    where,
    attributes: ['id', 'orderCode', 'paymentStatus', 'webhookEventLog'],
    order: [['createdAt', 'ASC']]
  });

  const escopo = registrationId
    ? `registration ${registrationId}`
    : eventId
      ? `evento ${eventId}`
      : 'todas as registrations';

  console.log(`Registrations com webhookEventLog (${escopo}): ${registrations.length}`);
  if (!registrations.length) return;
  if (isDryRun) {
    console.log('Dry-run ativo. Nenhuma atualização será aplicada.');
    for (const r of registrations) {
      console.log(`  ${r.orderCode} (${r.paymentStatus}) — log atual:`, JSON.stringify(r.webhookEventLog));
    }
    return;
  }

  let updated = 0;
  for (const registration of registrations) {
    await registration.update({ webhookEventLog: null });
    updated += 1;
  }

  console.log(`webhookEventLog limpo em ${updated} registration(s).`);
}

run()
  .catch((error) => {
    console.error('Erro ao limpar webhookEventLog:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
