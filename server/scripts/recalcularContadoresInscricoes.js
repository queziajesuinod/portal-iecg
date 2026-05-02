/* eslint-disable no-console */
/**
 * Script para recalcular currentRegistrations (Events) e currentQuantity (EventBatches)
 * com base nos status reais das inscrições.
 *
 * Necessário para corrigir eventos que tiveram inscrições parciais (sinal) que não
 * foram contabilizadas antes da correção do sistema.
 *
 * Uso:
 *   node server/scripts/recalcularContadoresInscricoes.js              (aplica correções)
 *   node server/scripts/recalcularContadoresInscricoes.js --dry-run    (apenas mostra, sem alterar)
 *   node server/scripts/recalcularContadoresInscricoes.js --event-id=<id>  (apenas um evento)
 */

const { Op } = require('sequelize');
const {
  sequelize,
  Event,
  EventBatch,
  Registration,
  RegistrationAttendee
} = require('../models');
const { COUNTABLE_PAYMENT_STATUSES } = require('../constants/registrationStatuses');

const isDryRun = process.argv.includes('--dry-run');
const eventIdArg = process.argv.find((a) => a.startsWith('--event-id='))?.split('=')[1];

async function run() {
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (sem alterações)' : 'APLICANDO CORREÇÕES'}`);
  if (eventIdArg) {
    console.log(`Filtrando evento: ${eventIdArg}`);
  }
  console.log('');

  const eventWhere = eventIdArg ? { id: eventIdArg } : {};
  const events = await Event.findAll({
    where: eventWhere,
    attributes: ['id', 'title', 'currentRegistrations'],
    order: [['createdAt', 'ASC']]
  });

  console.log(`Eventos encontrados: ${events.length}`);
  console.log('');

  let totalEventosAjustados = 0;
  let totalLotesAjustados = 0;

  for (const event of events) {
    // --- Recalcular currentRegistrations do evento ---
    const inscritosReais = await RegistrationAttendee.count({
      include: [{
        model: Registration,
        as: 'registration',
        where: {
          eventId: event.id,
          paymentStatus: { [Op.in]: COUNTABLE_PAYMENT_STATUSES }
        },
        attributes: []
      }]
    });

    const eventoDesatualizado = event.currentRegistrations !== inscritosReais;
    if (eventoDesatualizado) {
      console.log(`[EVENTO] "${event.title}" (${event.id})`);
      console.log(`  currentRegistrations: ${event.currentRegistrations} → ${inscritosReais}`);
      if (!isDryRun) {
        await Event.update(
          { currentRegistrations: inscritosReais },
          { where: { id: event.id } }
        );
      }
      totalEventosAjustados += 1;
    }

    // --- Recalcular currentQuantity de cada lote ---
    const lotes = await EventBatch.findAll({
      where: { eventId: event.id },
      attributes: ['id', 'name', 'currentQuantity']
    });

    for (const lote of lotes) {
      const quantidadeReal = await RegistrationAttendee.count({
        where: { batchId: lote.id },
        include: [{
          model: Registration,
          as: 'registration',
          where: {
            paymentStatus: { [Op.in]: COUNTABLE_PAYMENT_STATUSES }
          },
          attributes: []
        }]
      });

      const loteDesatualizado = lote.currentQuantity !== quantidadeReal;
      if (loteDesatualizado) {
        console.log(`  [LOTE] "${lote.name}" (${lote.id})`);
        console.log(`    currentQuantity: ${lote.currentQuantity} → ${quantidadeReal}`);
        if (!isDryRun) {
          await EventBatch.update(
            { currentQuantity: quantidadeReal },
            { where: { id: lote.id } }
          );
        }
        totalLotesAjustados += 1;
      }
    }
  }

  console.log('');
  console.log('--- Resumo ---');
  console.log(`Eventos ajustados : ${totalEventosAjustados}`);
  console.log(`Lotes ajustados   : ${totalLotesAjustados}`);
  if (isDryRun) {
    console.log('(Dry-run: nenhuma alteração foi salva)');
  }
}

run()
  .catch((error) => {
    console.error('Erro ao recalcular contadores:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
