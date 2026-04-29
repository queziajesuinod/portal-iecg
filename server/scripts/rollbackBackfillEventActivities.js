/* eslint-disable no-console */
/**
 * Desfaz o backfill de inscrições de eventos:
 *   - Remove MemberActivities criadas com source='backfill_event_registrations'
 *   - NÃO remove membros, jornadas nem marcos (são dados válidos)
 *
 * Uso:
 *   node server/scripts/rollbackBackfillEventActivities.js
 *   node server/scripts/rollbackBackfillEventActivities.js --dry-run
 */

const { sequelize, MemberActivity } = require('../models');

const isDryRun = process.argv.includes('--dry-run');

async function run() {
  const where = { metadata: { source: 'backfill_event_registrations' } };

  const total = await MemberActivity.count({ where });

  console.log(`\n${'='.repeat(60)}`);
  console.log('Rollback: atividades do backfill de eventos');
  if (isDryRun) console.log('MODO DRY-RUN — nenhuma alteração será salva');
  console.log(`Atividades encontradas: ${total}`);
  console.log(`${'='.repeat(60)}\n`);

  if (!total) {
    console.log('Nada a remover.');
    return;
  }

  if (isDryRun) {
    console.log(`Seriam removidas ${total} atividades (dry-run).`);
    return;
  }

  const deleted = await MemberActivity.destroy({ where });
  console.log(`✅ ${deleted} atividades removidas com sucesso.`);
}

run()
  .catch((err) => {
    console.error('Erro fatal:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
