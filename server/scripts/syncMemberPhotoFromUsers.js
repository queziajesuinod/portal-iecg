/* eslint-disable no-console */
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const schema = process.env.DB_SCHEMA || 'dev_iecg';
const isDryRun = process.argv.includes('--dry-run');

async function run() {
  const candidates = await sequelize.query(
    `
    SELECT m.id AS "memberId", m."userId", m."photoUrl" AS "currentPhotoUrl", u.image AS "userImage"
    FROM "${schema}"."Members" m
    JOIN "${schema}"."Users" u ON u.id = m."userId"
    WHERE m."userId" IS NOT NULL
      AND COALESCE(TRIM(u.image), '') <> ''
      AND COALESCE(m."photoUrl", '') <> COALESCE(u.image, '')
    `,
    { type: QueryTypes.SELECT }
  );

  console.log(`Membros elegíveis para sincronizar photoUrl: ${candidates.length}`);
  if (!candidates.length || isDryRun) {
    if (isDryRun) {
      console.log('Dry-run ativo, nenhuma alteração foi aplicada.');
    }
    return;
  }

  const updatedRows = await sequelize.query(
    `
    UPDATE "${schema}"."Members" m
    SET "photoUrl" = u.image,
        "updatedAt" = NOW()
    FROM "${schema}"."Users" u
    WHERE u.id = m."userId"
      AND m."userId" IS NOT NULL
      AND COALESCE(TRIM(u.image), '') <> ''
      AND COALESCE(m."photoUrl", '') <> COALESCE(u.image, '')
    RETURNING m.id
    `,
    { type: QueryTypes.SELECT }
  );

  const updatedCount = Array.isArray(updatedRows) ? updatedRows.length : 0;
  console.log(`Membros atualizados: ${updatedCount}`);
}

run()
  .catch((error) => {
    console.error('Erro ao sincronizar photoUrl dos membros:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
