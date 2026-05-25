/* eslint-disable no-console, no-await-in-loop, no-restricted-syntax */
/**
 * One-time sync: para toda celula com liderMemberId, copia a hierarquia
 * (Lideranca Apostolica, Pastor de Geracao, Pastor de Campus) do cadastro
 * do lider para as colunas da celula.
 *
 * Modos:
 *   default          → so preenche campos vazios na celula (idempotente, seguro)
 *   --force          → sobrescreve mesmo quando ja ha valor (cuidado)
 *   --dry-run        → so mostra o que faria, nao grava
 *
 * Exemplos:
 *   node scripts/syncCelulasHierarquia.js
 *   node scripts/syncCelulasHierarquia.js --dry-run
 *   node scripts/syncCelulasHierarquia.js --force
 *   node scripts/syncCelulasHierarquia.js --force --dry-run
 */

require('dotenv').config();
const { Op } = require('sequelize');
const {
  sequelize,
  Celula,
  Member,
  MemberCargo
} = require('../models');
const { syncCelulasHierarquiaForLeader } = require('../utils/celulaHierarquiaSync');

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

function describeUpdate(update) {
  return Object.entries(update)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
}

async function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('Sync: Hierarquia das células a partir do cadastro do líder');
  console.log(`Modo: ${isForce ? 'FORCE (sobrescreve)' : 'preenche apenas vazios'}`);
  console.log(isDryRun ? '⚠️  DRY-RUN — nenhuma alteração será gravada' : '✅  Modo real — alterações serão gravadas');
  console.log('='.repeat(70));

  try {
    await sequelize.authenticate();

    const liderIds = await Celula.findAll({
      where: { liderMemberId: { [Op.ne]: null } },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('liderMemberId')), 'liderMemberId']],
      raw: true
    });

    const uniqueLeaderIds = liderIds.map((r) => r.liderMemberId).filter(Boolean);
    console.log(`\nLíderes únicos com células: ${uniqueLeaderIds.length}`);

    let totalCelulasScanned = 0;
    let totalCelulasUpdated = 0;
    let totalLideresSemAlteracao = 0;

    for (const liderId of uniqueLeaderIds) {
      const leader = await Member.findByPk(liderId, {
        attributes: [
          'id',
          'fullName',
          'liderancaApostolicaMemberId',
          'pastorGeracaoMemberId',
          'pastorCampusMemberId'
        ]
      });

      if (!leader) {
        console.log(`\n  [WARN] liderMemberId ${liderId} não existe em Members`);
        continue;
      }

      const result = await syncCelulasHierarquiaForLeader(leader, {
        models: { Celula, Member, MemberCargo },
        force: isForce,
        dryRun: isDryRun
      });

      totalCelulasScanned += result.scanned;
      totalCelulasUpdated += result.updated;
      if (result.changes.length === 0) {
        totalLideresSemAlteracao += 1;
        continue;
      }

      console.log(`\nLíder "${leader.fullName}" (${leader.id}) — ${result.changes.length} célula(s) atualizada(s):`);
      result.changes.forEach((c) => {
        console.log(`  [${isDryRun ? 'DRY' : 'OK'}] "${c.celulaNome}" → ${describeUpdate(c.updates)}`);
      });
    }

    console.log('\n══ Resumo ══');
    console.log(`Líderes processados: ${uniqueLeaderIds.length}`);
    console.log(`Líderes sem alteração: ${totalLideresSemAlteracao}`);
    console.log(`Células varridas: ${totalCelulasScanned}`);
    console.log(`Células atualizadas: ${totalCelulasUpdated}`);
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
