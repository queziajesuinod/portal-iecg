/* eslint-disable no-console */
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const schema = process.env.DB_SCHEMA || 'dev_iecg';
const isDryRun = process.argv.includes('--dry-run');

async function ensureColumnExists() {
  const cols = await sequelize.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = :schema
      AND table_name = 'celulas'
      AND column_name = 'liderMemberId'
    `,
    { replacements: { schema }, type: QueryTypes.SELECT }
  );
  return cols.length > 0;
}

async function run() {
  const hasLeaderMemberColumn = await ensureColumnExists();
  if (!hasLeaderMemberColumn) {
    throw new Error('Coluna celulas.liderMemberId não encontrada. Execute as migrations antes.');
  }

  const [summaryBefore] = await sequelize.query(
    `
    SELECT
      COUNT(*)::int AS total_celulas,
      COUNT(*) FILTER (WHERE c."liderId" IS NOT NULL)::int AS celulas_com_lider_user,
      COUNT(*) FILTER (WHERE c."liderMemberId" IS NOT NULL)::int AS celulas_com_lider_member
    FROM "${schema}".celulas c
    `,
    { type: QueryTypes.SELECT }
  );

  const unresolved = await sequelize.query(
    `
    SELECT c.id, c.celula, c."liderId"
    FROM "${schema}".celulas c
    LEFT JOIN "${schema}"."Members" m ON m."userId" = c."liderId"
    WHERE c."liderId" IS NOT NULL
      AND m.id IS NULL
    ORDER BY c."createdAt" ASC
    `,
    { type: QueryTypes.SELECT }
  );

  console.log('Resumo antes:', summaryBefore);
  console.log(`Células com liderId(user) sem Member correspondente: ${unresolved.length}`);

  if (isDryRun) {
    console.log('Dry-run ativo, nenhuma alteração aplicada.');
    return;
  }

  const updatedCelulas = await sequelize.query(
    `
    UPDATE "${schema}".celulas c
    SET "liderMemberId" = m.id
    FROM "${schema}"."Members" m
    WHERE m."userId" = c."liderId"
      AND c."liderId" IS NOT NULL
      AND COALESCE(c."liderMemberId"::text, '') <> m.id::text
    RETURNING c.id
    `,
    { type: QueryTypes.SELECT }
  );

  const updatedMembersCampus = await sequelize.query(
    `
    WITH ranked AS (
      SELECT
        c."liderMemberId" AS member_id,
        c."campusId" AS campus_id,
        ROW_NUMBER() OVER (
          PARTITION BY c."liderMemberId"
          ORDER BY c."updatedAt" DESC NULLS LAST, c."createdAt" DESC NULLS LAST, c.id
        ) AS rn
      FROM "${schema}".celulas c
      WHERE c."liderMemberId" IS NOT NULL
        AND c."campusId" IS NOT NULL
    )
    UPDATE "${schema}"."Members" m
    SET "campusId" = r.campus_id,
        "updatedAt" = NOW()
    FROM ranked r
    WHERE r.rn = 1
      AND r.member_id = m.id
      AND COALESCE(m."campusId"::text, '') <> r.campus_id::text
    RETURNING m.id
    `,
    { type: QueryTypes.SELECT }
  );

  const [summaryAfter] = await sequelize.query(
    `
    SELECT
      COUNT(*)::int AS total_celulas,
      COUNT(*) FILTER (WHERE c."liderId" IS NOT NULL)::int AS celulas_com_lider_user,
      COUNT(*) FILTER (WHERE c."liderMemberId" IS NOT NULL)::int AS celulas_com_lider_member
    FROM "${schema}".celulas c
    `,
    { type: QueryTypes.SELECT }
  );

  console.log(`Células atualizadas com liderMemberId: ${updatedCelulas.length}`);
  console.log(`Members com campusId sincronizado: ${updatedMembersCampus.length}`);
  console.log('Resumo depois:', summaryAfter);
}

run()
  .catch((error) => {
    console.error('Erro ao sincronizar líderes/campus:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
