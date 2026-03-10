/* eslint-disable no-console */
const crypto = require('crypto');
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const schema = process.env.DB_SCHEMA || 'dev_iecg';
const isDryRun = process.argv.includes('--dry-run');
const TARGET_ACTIVITY_TYPE = 'LIDERANCA_AVANCADA3_MOD2_INICIO';

function sanitizePhone(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

async function loadCandidates() {
  return sequelize.query(
    `
    SELECT
      m.id AS "memberId",
      m."fullName",
      m.phone,
      m.whatsapp,
      u.id AS "userId"
    FROM "${schema}"."Members" m
    JOIN "${schema}"."Users" u ON u.id = m."userId"
    WHERE m."userId" IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM "${schema}"."MemberActivities" ma
        WHERE ma."memberId" = m.id
          AND ma."activityType" = :targetActivityType
      )
    ORDER BY m."createdAt" ASC
    `,
    {
      replacements: { targetActivityType: TARGET_ACTIVITY_TYPE },
      type: QueryTypes.SELECT
    }
  );
}

async function updatePassword(userId, password, transaction) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashSHA256WithSalt(password, salt);

  await sequelize.query(
    `
    UPDATE "${schema}"."Users"
    SET salt = :salt,
        "passwordHash" = :passwordHash,
        "updatedAt" = NOW()
    WHERE id = :userId
    `,
    {
      replacements: {
        userId,
        salt,
        passwordHash
      },
      type: QueryTypes.UPDATE,
      transaction
    }
  );
}

async function run() {
  const rows = await loadCandidates();
  const eligible = [];
  const skippedWithoutPhone = [];

  rows.forEach((row) => {
    const normalizedPhone = sanitizePhone(row.phone || row.whatsapp);

    if (!normalizedPhone) {
      skippedWithoutPhone.push(row);
      return;
    }

    eligible.push({
      ...row,
      normalizedPhone
    });
  });

  console.log(`Membros com usuario vinculado e atividade ${TARGET_ACTIVITY_TYPE}: ${rows.length}`);
  console.log(`Usuarios elegiveis para redefinir senha pelo telefone: ${eligible.length}`);
  console.log(`Usuarios ignorados por falta de telefone no membro: ${skippedWithoutPhone.length}`);

  if (skippedWithoutPhone.length) {
    skippedWithoutPhone.slice(0, 10).forEach((row) => {
      console.log(`Ignorado sem telefone: membro ${row.memberId} / user ${row.userId} / ${row.fullName}`);
    });
  }

  if (!eligible.length || isDryRun) {
    if (isDryRun) {
      console.log('Dry-run ativo, nenhuma senha foi alterada.');
      eligible.slice(0, 10).forEach((row) => {
        console.log(`Dry-run: user ${row.userId} receberia senha ${row.normalizedPhone}`);
      });
    }
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const row of eligible) {
    const transaction = await sequelize.transaction();

    try {
      await updatePassword(row.userId, row.normalizedPhone, transaction);
      await transaction.commit();
      updated += 1;
    } catch (error) {
      await transaction.rollback();
      failed += 1;
      console.error(`Erro ao atualizar user ${row.userId} (membro ${row.memberId}): ${error.message}`);
    }
  }

  console.log(`Usuarios atualizados: ${updated}`);
  console.log(`Falhas: ${failed}`);
}

run()
  .catch((error) => {
    console.error('Erro ao redefinir senhas dos usuarios pelos telefones dos membros:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
