/* eslint-disable no-console, no-await-in-loop */
/**
 * Define a senha inicial dos líderes de célula como o número de WhatsApp.
 *
 * Critérios para atualizar:
 *   - Usuário é líder de ao menos uma célula ativa (Celula.liderId)
 *   - User possui email preenchido
 *   - Member vinculado possui whatsapp preenchido
 *   - User ainda NÃO possui senha cadastrada (passwordHash ou salt nulos/vazios)
 *
 * Uso:
 *   node scripts/setLiderCelulaPasswordFromWhatsapp.js            # executa
 *   node scripts/setLiderCelulaPasswordFromWhatsapp.js --dry-run  # só mostra, não grava
 */

require('dotenv').config();
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const schema = process.env.DB_SCHEMA || 'dev_iecg';
const isDryRun = process.argv.includes('--dry-run');

function sanitizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

async function loadCandidates() {
  return sequelize.query(
    `
    SELECT DISTINCT
      u.id            AS "userId",
      u.name          AS "userName",
      u.email         AS "email",
      u."passwordHash",
      u.salt,
      m.id            AS "memberId",
      m."fullName",
      m.whatsapp,
      m.phone,
      c.celula        AS "nomeCelula"
    FROM "${schema}"."Users" u
    JOIN "${schema}"."celulas" c ON c."liderId" = u.id AND c.ativo = true
    LEFT JOIN "${schema}"."Members" m ON m."userId" = u.id
    WHERE
      NULLIF(BTRIM(COALESCE(u.email, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(m.whatsapp, m.phone, '')), '') IS NOT NULL
      AND (
        u."passwordHash" IS NULL
        OR BTRIM(u."passwordHash") = ''
        OR u.salt IS NULL
        OR BTRIM(u.salt) = ''
      )
    ORDER BY u.name
    `,
    { type: QueryTypes.SELECT }
  );
}

async function updatePassword(userId, whatsapp) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashSHA256WithSalt(whatsapp, salt);

  await sequelize.query(
    `
    UPDATE "${schema}"."Users"
    SET salt          = :salt,
        "passwordHash" = :passwordHash,
        "updatedAt"   = NOW()
    WHERE id = :userId
    `,
    { replacements: { userId, salt, passwordHash }, type: QueryTypes.UPDATE }
  );
}

async function main() {
  console.log(`\n=== setLiderCelulaPasswordFromWhatsapp ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);

  await sequelize.authenticate();

  const candidates = await loadCandidates();

  if (!candidates.length) {
    console.log('Nenhum líder elegível encontrado (sem senha + com email + com whatsapp).');
    return;
  }

  console.log(`Líderes elegíveis: ${candidates.length}\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of candidates) {
    const whatsapp = sanitizePhone(row.whatsapp || row.phone);

    if (!whatsapp) {
      console.log(`  ─ IGNORADO  ${row.userName} — whatsapp vazio após sanitização`);
      skipped += 1;
      continue;
    }

    console.log(`  → ${row.userName} (${row.email}) | célula: ${row.nomeCelula} | senha: ${whatsapp}`);

    if (!isDryRun) {
      try {
        await updatePassword(row.userId, whatsapp);
        updated += 1;
      } catch (err) {
        console.error(`    ✖ Erro ao atualizar ${row.userId}: ${err.message}`);
        errors += 1;
      }
    } else {
      updated += 1;
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log(`Atualizados  : ${updated}`);
  console.log(`Ignorados    : ${skipped}`);
  console.log(`Erros        : ${errors}`);
  if (isDryRun) console.log('\n[DRY-RUN] Nenhuma senha foi gravada.');
  console.log('');
}

main()
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
