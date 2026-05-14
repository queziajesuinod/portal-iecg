/* eslint-disable no-console, no-await-in-loop, no-continue, no-restricted-syntax */
/**
 * Backfill: cria CelulaMembroVinculos para:
 *  1. Líderes de células (Celula.liderMemberId)
 *  2. Membros com celulaId preenchido (apelos CONSOLIDADO_CELULA + atribuições diretas)
 *
 * Uso:
 *   node scripts/backfillCelulaVinculos.js            # executa
 *   node scripts/backfillCelulaVinculos.js --dry-run  # só mostra, não grava
 */

require('dotenv').config();
const { Op, Sequelize } = require('sequelize');
const {
  sequelize,
  ApeloDirecionadoCelula,
  Celula,
  Member,
  CelulaMembroVinculo
} = require('../models');
const { todayDateOnly } = require('../utils/dateTime');

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

// Últimos 9 dígitos — suficiente para evitar falsos positivos de DDI/DDD
function phoneSuffix(digits) {
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

const isDryRun = process.argv.includes('--dry-run');
const today = todayDateOnly();

function toDateOnly(value) {
  if (!value) return today;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? today : d.toISOString().slice(0, 10);
}

async function criarVinculo({
  celulaId, membroId, papel, origem, dataEntrada
}) {
  const existente = await CelulaMembroVinculo.findOne({
    where: { celulaId, membroId, ativo: true }
  });

  if (existente) {
    // Promove para lider se necessário
    if (papel === 'lider' && existente.papel !== 'lider') {
      if (!isDryRun) await existente.update({ papel: 'lider', origem });
      console.log(`  [UPDATE] membro ${membroId} → papel atualizado para lider na célula ${celulaId}`);
      return 'updated';
    }
    console.log(`  [SKIP]   membro ${membroId} já vinculado (${existente.papel}) na célula ${celulaId}`);
    return 'skipped';
  }

  if (!isDryRun) {
    await CelulaMembroVinculo.create({
      celulaId,
      membroId,
      papel,
      dataEntrada: dataEntrada || new Date().toISOString().slice(0, 10),
      ativo: true,
      origem
    });
  }
  console.log(`  [CREATE] membro ${membroId} → papel=${papel} na célula ${celulaId}`);
  return 'created';
}

async function backfillLideres() {
  console.log('\n══ 1. Líderes de células ══');

  const celulas = await Celula.findAll({
    where: { liderMemberId: { [Op.ne]: null } },
    attributes: ['id', 'celula', 'liderMemberId', 'createdAt']
  });

  console.log(`Células com líder encontradas: ${celulas.length}`);

  let created = 0; let updated = 0; let
    skipped = 0;

  for (const celula of celulas) {
    console.log(`\nCélula "${celula.celula}" (${celula.id})`);
    const result = await criarVinculo({
      celulaId: celula.id,
      membroId: celula.liderMemberId,
      papel: 'lider',
      origem: 'lideranca',
      dataEntrada: toDateOnly(celula.createdAt)
    });
    if (result === 'created') created += 1;
    else if (result === 'updated') updated += 1;
    else skipped += 1;
  }

  console.log(`\nLíderes → criados: ${created}, atualizados: ${updated}, ignorados: ${skipped}`);
  return { created, updated, skipped };
}

async function backfillMembros() {
  console.log('\n══ 2. Membros com celulaId preenchido ══');

  // Carrega conjunto de liderMemberIds para evitar sobrescrever papel de lider
  const celulaLiderMap = {};
  const celulas = await Celula.findAll({
    where: { liderMemberId: { [Op.ne]: null } },
    attributes: ['id', 'liderMemberId']
  });
  for (const c of celulas) {
    celulaLiderMap[`${c.id}_${c.liderMemberId}`] = true;
  }

  const membros = await Member.findAll({
    where: { celulaId: { [Op.ne]: null } },
    attributes: ['id', 'fullName', 'celulaId', 'createdAt']
  });

  console.log(`Membros com celulaId encontrados: ${membros.length}`);

  let created = 0; let updated = 0; let
    skipped = 0;

  for (const membro of membros) {
    const isLider = celulaLiderMap[`${membro.celulaId}_${membro.id}`];
    if (isLider) {
      console.log(`\n  [SKIP]   "${membro.fullName}" já é líder da célula ${membro.celulaId} (tratado na etapa 1)`);
      skipped += 1;
      continue;
    }

    console.log(`\nMembro "${membro.fullName}" (${membro.id}) → célula ${membro.celulaId}`);
    const result = await criarVinculo({
      celulaId: membro.celulaId,
      membroId: membro.id,
      papel: 'membro',
      origem: 'apelo',
      dataEntrada: toDateOnly(membro.createdAt)
    });
    if (result === 'created') created += 1;
    else if (result === 'updated') updated += 1;
    else skipped += 1;
  }

  console.log(`\nMembros → criados: ${created}, atualizados: ${updated}, ignorados: ${skipped}`);
  return { created, updated, skipped };
}

async function backfillApelos() {
  console.log('\n══ 3. Apelos CONSOLIDADO_CELULA ══');

  const apelos = await ApeloDirecionadoCelula.findAll({
    where: {
      status: 'CONSOLIDADO_CELULA',
      celula_id: { [Op.ne]: null },
      whatsapp: { [Op.ne]: null }
    },
    attributes: ['id', 'nome', 'whatsapp', 'celula_id', 'data_direcionamento', 'createdAt']
  });

  console.log(`Apelos consolidados encontrados: ${apelos.length}`);

  let created = 0; let skipped = 0; let
    notFound = 0;

  for (const apelo of apelos) {
    const digits = normalizePhone(apelo.whatsapp);
    if (!digits || digits.length < 8) {
      console.log(`  [SKIP]   "${apelo.nome}" — whatsapp inválido: ${apelo.whatsapp}`);
      skipped += 1;
      continue;
    }

    const suffix = phoneSuffix(digits);

    // Busca membro pelo sufixo do whatsapp
    const membro = await Member.findOne({
      where: {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn('regexp_replace', Sequelize.fn('coalesce', Sequelize.col('whatsapp'), ''), '\\D', '', 'g'),
            { [Op.like]: `%${suffix}` }
          ),
          Sequelize.where(
            Sequelize.fn('regexp_replace', Sequelize.fn('coalesce', Sequelize.col('phone'), ''), '\\D', '', 'g'),
            { [Op.like]: `%${suffix}` }
          )
        ]
      },
      attributes: ['id', 'fullName', 'celulaId']
    });

    if (!membro) {
      console.log(`  [NOT FOUND] "${apelo.nome}" (${apelo.whatsapp}) — nenhum membro com este telefone`);
      notFound += 1;
      continue;
    }

    // Se o membro já é líder desta célula, pula
    const vinculoExistente = await CelulaMembroVinculo.findOne({
      where: { celulaId: apelo.celula_id, membroId: membro.id, ativo: true }
    });
    if (vinculoExistente) {
      console.log(`  [SKIP]   "${membro.fullName}" já vinculado (${vinculoExistente.papel}) na célula ${apelo.celula_id}`);
      skipped += 1;
      continue;
    }

    const dataEntrada = toDateOnly(apelo.data_direcionamento || apelo.createdAt);
    console.log(`\nApelo "${apelo.nome}" → membro "${membro.fullName}" (${membro.id}) → célula ${apelo.celula_id}`);
    const result = await criarVinculo({
      celulaId: apelo.celula_id,
      membroId: membro.id,
      papel: 'membro',
      origem: 'apelo',
      dataEntrada
    });
    if (result === 'created') created += 1;
    else skipped += 1;
  }

  console.log(`\nApelos → criados: ${created}, ignorados: ${skipped}, não encontrados: ${notFound}`);
  return { created, skipped, notFound };
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Backfill: CelulaMembroVinculos');
  console.log(isDryRun ? '⚠️  MODO DRY-RUN — nenhuma alteração será gravada' : '✅  Modo real — alterações serão gravadas');
  console.log('='.repeat(60));

  try {
    await sequelize.authenticate();

    const r1 = await backfillLideres();
    const r2 = await backfillMembros();
    const r3 = await backfillApelos();

    console.log('\n══ Resumo Final ══');
    console.log(`Líderes  → criados: ${r1.created}, atualizados: ${r1.updated}, ignorados: ${r1.skipped}`);
    console.log(`Membros  → criados: ${r2.created}, atualizados: ${r2.updated}, ignorados: ${r2.skipped}`);
    console.log(`Apelos   → criados: ${r3.created}, ignorados: ${r3.skipped}, não encontrados: ${r3.notFound}`);
    console.log(`Total criados: ${r1.created + r2.created + r3.created}`);
    if (isDryRun) console.log('\n⚠️  Dry-run concluído. Rode sem --dry-run para aplicar.');
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
