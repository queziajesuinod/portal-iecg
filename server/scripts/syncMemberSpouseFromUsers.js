/* eslint-disable no-console */
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const schema = process.env.DB_SCHEMA || 'dev_iecg';
const isDryRun = process.argv.includes('--dry-run');

async function run() {
  const [summaryBefore] = await sequelize.query(
    `
    SELECT
      COUNT(*)::int AS total_members,
      COUNT(*) FILTER (WHERE m."userId" IS NOT NULL)::int AS members_com_user,
      COUNT(*) FILTER (WHERE m."spouseMemberId" IS NOT NULL)::int AS members_com_spouse
    FROM "${schema}"."Members" m
    `,
    { type: QueryTypes.SELECT }
  );

  const unresolved = await sequelize.query(
    `
    SELECT m.id AS "memberId", m."userId", u.conjuge_id AS "spouseUserId"
    FROM "${schema}"."Members" m
    JOIN "${schema}"."Users" u ON u.id = m."userId"
    LEFT JOIN "${schema}"."Members" s ON s."userId" = u.conjuge_id
    WHERE u.conjuge_id IS NOT NULL
      AND s.id IS NULL
    ORDER BY m."createdAt" ASC
    `,
    { type: QueryTypes.SELECT }
  );

  const eligible = await sequelize.query(
    `
    SELECT COUNT(*)::int AS count
    FROM "${schema}"."Members" m
    JOIN "${schema}"."Users" u ON u.id = m."userId"
    JOIN "${schema}"."Members" s ON s."userId" = u.conjuge_id
    WHERE u.conjuge_id IS NOT NULL
      AND COALESCE(m."spouseMemberId"::text, '') <> s.id::text
    `,
    { type: QueryTypes.SELECT }
  );

  const eligibleCount = Number(eligible?.[0]?.count || 0);

  console.log('Resumo antes:', summaryBefore);
  console.log(`Members elegiveis para atualizar spouseMemberId: ${eligibleCount}`);
  console.log(`Relacionamentos de conjuge (User) sem Member correspondente: ${unresolved.length}`);

  if (isDryRun) {
    console.log('Dry-run ativo, nenhuma alteracao aplicada.');
    return;
  }

  const updated = await sequelize.query(
    `
    UPDATE "${schema}"."Members" m
    SET "spouseMemberId" = s.id,
        "updatedAt" = NOW()
    FROM "${schema}"."Users" u
    JOIN "${schema}"."Members" s ON s."userId" = u.conjuge_id
    WHERE u.id = m."userId"
      AND u.conjuge_id IS NOT NULL
      AND COALESCE(m."spouseMemberId"::text, '') <> s.id::text
    RETURNING m.id
    `,
    { type: QueryTypes.SELECT }
  );

  const [summaryAfter] = await sequelize.query(
    `
    SELECT
      COUNT(*)::int AS total_members,
      COUNT(*) FILTER (WHERE m."userId" IS NOT NULL)::int AS members_com_user,
      COUNT(*) FILTER (WHERE m."spouseMemberId" IS NOT NULL)::int AS members_com_spouse
    FROM "${schema}"."Members" m
    `,
    { type: QueryTypes.SELECT }
  );

  console.log(`Members atualizados com spouseMemberId: ${updated.length}`);
  console.log('Resumo depois:', summaryAfter);
}

run()
  .catch((error) => {
    console.error('Erro ao sincronizar spouseMemberId de Members:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
