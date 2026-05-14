/* eslint-disable no-console, no-await-in-loop, no-continue, no-restricted-syntax */
/**
 * Sync: atualiza campos dos Members com dados atualizados do User vinculado.
 *
 * Campos sincronizados (User → Member):
 *   name        → fullName
 *   email       → email
 *   telefone    → whatsapp
 *   data_nascimento → birthDate
 *   cpf         → cpf
 *   estado_civil → maritalStatus
 *   endereco    → street
 *   bairro      → neighborhood
 *   numero      → number
 *   cep         → zipCode
 *   image       → photoUrl
 *
 * Uso:
 *   node scripts/syncUserDataToMembers.js            # executa
 *   node scripts/syncUserDataToMembers.js --dry-run  # só mostra, não grava
 */

require('dotenv').config();
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const schema = process.env.DB_SCHEMA || 'dev_iecg';
const isDryRun = process.argv.includes('--dry-run');

const MARITAL_MAP = {
  solteiro: 'SOLTEIRO',
  casado: 'CASADO',
  viuvo: 'VIUVO',
  divorciado: 'DIVORCIADO',
  uniao_estavel: 'UNIAO_ESTAVEL',
  uniao: 'UNIAO_ESTAVEL'
};

function mapMaritalStatus(value) {
  if (!value) return null;
  const key = String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return MARITAL_MAP[key] || null;
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

async function run() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Sync: User data → Members');
  console.log(isDryRun ? '⚠️  MODO DRY-RUN — nenhuma alteração será gravada' : '✅  Modo real — alterações serão gravadas');
  console.log('='.repeat(60));

  await sequelize.authenticate();

  const pairs = await sequelize.query(
    `
    SELECT
      m.id          AS "memberId",
      m."fullName"  AS "memberFullName",
      m.email       AS "memberEmail",
      m.whatsapp    AS "memberWhatsapp",
      m."birthDate" AS "memberBirthDate",
      m.cpf         AS "memberCpf",
      m."maritalStatus" AS "memberMaritalStatus",
      m.street      AS "memberStreet",
      m.neighborhood AS "memberNeighborhood",
      m.number      AS "memberNumber",
      m."zipCode"   AS "memberZipCode",
      m."photoUrl"  AS "memberPhotoUrl",
      u.id          AS "userId",
      u.name        AS "userName",
      u.email       AS "userEmail",
      u.telefone    AS "userTelefone",
      u.data_nascimento AS "userBirthDate",
      u.cpf         AS "userCpf",
      u.estado_civil AS "userEstadoCivil",
      u.endereco    AS "userEndereco",
      u.bairro      AS "userBairro",
      u.numero      AS "userNumero",
      u.cep         AS "userCep",
      u.image       AS "userImage"
    FROM "${schema}"."Members" m
    INNER JOIN "${schema}"."Users" u ON u.id = m."userId"
    WHERE m."deletedAt" IS NULL
    ORDER BY m."updatedAt" ASC
    `,
    { type: QueryTypes.SELECT }
  );

  console.log(`\nPares User→Member encontrados: ${pairs.length}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of pairs) {
    const rawEmail = row.userEmail ? String(row.userEmail).trim() : null;
    const validEmail = isValidEmail(rawEmail) ? rawEmail : null;
    const maritalStatus = mapMaritalStatus(row.userEstadoCivil);
    const whatsapp = row.userTelefone ? String(row.userTelefone).replace(/\D/g, '') || null : null;

    const updates = {};

    if (row.userName && row.userName.trim() !== row.memberFullName) {
      updates.fullName = row.userName.trim();
    }
    if (validEmail !== null && validEmail !== row.memberEmail) {
      updates.email = validEmail;
    }
    if (whatsapp && whatsapp !== row.memberWhatsapp) {
      updates.whatsapp = whatsapp;
    }
    if (row.userBirthDate && row.userBirthDate !== row.memberBirthDate) {
      updates.birthDate = row.userBirthDate;
    }
    if (maritalStatus && maritalStatus !== row.memberMaritalStatus) {
      updates.maritalStatus = maritalStatus;
    }
    if (row.userEndereco && row.userEndereco !== row.memberStreet) {
      updates.street = row.userEndereco;
    }
    if (row.userBairro && row.userBairro !== row.memberNeighborhood) {
      updates.neighborhood = row.userBairro;
    }
    if (row.userNumero && row.userNumero !== row.memberNumber) {
      updates.number = row.userNumero;
    }
    if (row.userCep && row.userCep !== row.memberZipCode) {
      updates.zipCode = row.userCep;
    }
    if (row.userImage && row.userImage !== row.memberPhotoUrl) {
      updates.photoUrl = row.userImage;
    }

    if (!Object.keys(updates).length) {
      skipped += 1;
      continue;
    }

    console.log(`\n[Member ${row.memberId}] "${row.memberFullName}"`);
    for (const [field, value] of Object.entries(updates)) {
      console.log(`  ${field}: ${row[`member${field.charAt(0).toUpperCase()}${field.slice(1)}`] ?? '(null)'} → ${value}`);
    }

    if (isDryRun) {
      skipped += 1;
      continue;
    }

    try {
      // Tenta campo a campo para isolar qual causa o erro
      for (const [field, value] of Object.entries(updates)) {
        try {
          await sequelize.query(
            `UPDATE "${schema}"."Members" SET "${field}" = :value, "updatedAt" = NOW() WHERE id = :memberId`,
            { replacements: { value, memberId: row.memberId }, type: QueryTypes.UPDATE }
          );
        } catch (fieldErr) {
          const constraint = fieldErr.original?.constraint || '';
          const detail = fieldErr.original?.detail || fieldErr.message;

          // Email duplicado: pula (não sobrescreve)
          if (field === 'email' && constraint.includes('email')) {
            console.warn(`  ⚠️  Email ${value} já existe em outro Member — campo pulado.`);
            continue;
          }

          // Qualquer outro erro: registra e continua
          failed += 1;
          console.error(`  ❌ Campo "${field}" = ${JSON.stringify(value)} — ${detail}`);
          console.error(`     Member ${row.memberId} ("${row.memberFullName}") | User ${row.userId}`);
        }
      }
      updated += 1;
    } catch (err) {
      failed += 1;
      console.error(`  ❌ Erro geral ao atualizar Member ${row.memberId} ("${row.memberFullName}")`);
      console.error(`     Motivo : ${err.message}`);
      if (err.original?.detail) console.error(`     Detalhe: ${err.original.detail}`);
      console.error(`     User ${row.userId} | email: ${row.userEmail} | cpf: ${row.userCpf}`);
    }
  }

  console.log('\n══ Resumo ══');
  console.log(`Atualizados: ${updated}`);
  console.log(`Sem diferença: ${skipped}`);
  console.log(`Falhas: ${failed}`);
  if (isDryRun) console.log('\n⚠️  Dry-run concluído. Rode sem --dry-run para aplicar.');
}

run()
  .catch((err) => {
    console.error('\n❌ Erro fatal:', err.message);
    console.error(err.stack);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
