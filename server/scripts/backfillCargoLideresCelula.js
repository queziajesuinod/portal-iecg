/* eslint-disable no-console, no-await-in-loop, no-continue, no-restricted-syntax */
/**
 * Backfill: atribui o cargo 'lideranca_apostolica' a todos os membros que são líderes de célula.
 *
 * ⚠️  ATENÇÃO: nem todo líder de célula é Liderança Apostólica.
 * Use este script com cuidado — ele é mais útil para um setup inicial em
 * que TODOS os líderes atuais sejam assumidos como Liderança Apostólica.
 * Depois de rodar, revise manualmente e remova o cargo dos líderes que
 * não pertencem à Liderança Apostólica.
 *
 * Fontes de líderes:
 *   1. Celula.liderMemberId (líder principal da célula)
 *   2. CelulaMembroVinculo com papel='lider' e ativo=true
 *
 * Uso:
 *   node scripts/backfillCargoLideresCelula.js            # executa
 *   node scripts/backfillCargoLideresCelula.js --dry-run  # só mostra, não grava
 */

require('dotenv').config();
const { Op } = require('sequelize');
const {
  sequelize,
  Celula,
  CelulaMembroVinculo,
  Member,
  MemberCargo
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');
const CARGO = 'lideranca_apostolica';

async function garantirCargo(membroId, fonte) {
  const existente = await MemberCargo.findOne({
    where: { membroId, cargo: CARGO, ativo: true }
  });

  if (existente) {
    console.log(`  [SKIP]   membro ${membroId} já possui cargo '${CARGO}' (fonte: ${fonte})`);
    return 'skipped';
  }

  if (!isDryRun) {
    await MemberCargo.create({
      membroId,
      cargo: CARGO,
      ativo: true,
      observacao: `Atribuído via backfill (fonte: ${fonte})`
    });
  }
  console.log(`  [CREATE] membro ${membroId} → cargo '${CARGO}' (fonte: ${fonte})`);
  return 'created';
}

async function coletarLideresCelulas() {
  const celulas = await Celula.findAll({
    where: { liderMemberId: { [Op.ne]: null } },
    attributes: ['id', 'celula', 'liderMemberId']
  });
  return celulas;
}

async function coletarLideresVinculos() {
  const vinculos = await CelulaMembroVinculo.findAll({
    where: { papel: 'lider', ativo: true },
    attributes: ['id', 'celulaId', 'membroId']
  });
  return vinculos;
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log("Backfill: cargo 'lideranca_apostolica' para líderes de célula");
  console.log(isDryRun ? '⚠️  MODO DRY-RUN — nenhuma alteração será gravada' : '✅  Modo real — alterações serão gravadas');
  console.log('='.repeat(60));

  try {
    await sequelize.authenticate();

    const processados = new Set();
    let created = 0;
    let skipped = 0;
    let invalidos = 0;

    console.log('\n══ 1. Líderes via Celula.liderMemberId ══');
    const celulas = await coletarLideresCelulas();
    console.log(`Células com liderMemberId: ${celulas.length}`);

    for (const celula of celulas) {
      const membroId = celula.liderMemberId;
      if (processados.has(membroId)) {
        console.log(`  [DUP]    membro ${membroId} já processado nesta execução (célula "${celula.celula}")`);
        continue;
      }

      const membro = await Member.findByPk(membroId, { attributes: ['id', 'fullName'] });
      if (!membro) {
        console.log(`  [WARN]   liderMemberId ${membroId} não existe em Members (célula "${celula.celula}")`);
        invalidos += 1;
        continue;
      }

      console.log(`\nCélula "${celula.celula}" → líder "${membro.fullName}" (${membro.id})`);
      const result = await garantirCargo(membro.id, `Celula.liderMemberId [${celula.celula}]`);
      if (result === 'created') created += 1;
      else skipped += 1;
      processados.add(membroId);
    }

    console.log('\n══ 2. Líderes via CelulaMembroVinculo (papel=lider) ══');
    const vinculos = await coletarLideresVinculos();
    console.log(`Vínculos com papel='lider': ${vinculos.length}`);

    for (const vinculo of vinculos) {
      const { membroId } = vinculo;
      if (processados.has(membroId)) {
        console.log(`  [DUP]    membro ${membroId} já processado nesta execução`);
        continue;
      }

      const membro = await Member.findByPk(membroId, { attributes: ['id', 'fullName'] });
      if (!membro) {
        console.log(`  [WARN]   membroId ${membroId} de vinculo ${vinculo.id} não existe em Members`);
        invalidos += 1;
        continue;
      }

      console.log(`\nVínculo ${vinculo.id} → líder "${membro.fullName}" (${membro.id})`);
      const result = await garantirCargo(membro.id, `CelulaMembroVinculo [${vinculo.id}]`);
      if (result === 'created') created += 1;
      else skipped += 1;
      processados.add(membroId);
    }

    console.log('\n══ Resumo Final ══');
    console.log(`Membros únicos processados: ${processados.size}`);
    console.log(`Cargos criados: ${created}`);
    console.log(`Cargos ignorados (já existiam): ${skipped}`);
    console.log(`Membros inválidos / não encontrados: ${invalidos}`);
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
