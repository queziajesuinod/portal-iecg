/* eslint-disable no-await-in-loop, no-restricted-syntax, no-console */
/**
 * Backfill: promove a MEMBRO (status + jornada) e garante a atividade
 * CONSOLIDADO_CELULA para todo membro cujo apelo direcionado já está
 * CONSOLIDADO_CELULA mas não passou pela promoção no passado.
 *
 * Uso:
 *   node server/scripts/backfillConsolidados.js           (DRY-RUN, não grava)
 *   node server/scripts/backfillConsolidados.js --apply   (aplica de verdade)
 *
 * Idempotente: reusa _promoverMembroConsolidado e _ensureConsolidacaoActivity,
 * que só alteram quando necessário.
 */
require('dotenv').config();

const {
  ApeloDirecionadoCelula, MemberActivity, sequelize
} = require('../models');
const svc = require('../services/ApeloDirecionadoCelulaService');

const APPLY = process.argv.includes('--apply');

(async () => {
  const apelos = await ApeloDirecionadoCelula.findAll({
    where: { status: 'CONSOLIDADO_CELULA' },
    order: [['createdAt', 'ASC']]
  });

  console.log(`Apelos CONSOLIDADO_CELULA: ${apelos.length} | modo: ${APPLY ? 'APLICAR' : 'DRY-RUN'}`);

  let promovidos = 0;
  let jaMembro = 0;
  let atividadesCriadas = 0;
  let semMembro = 0;
  let erros = 0;
  const exemplos = [];

  for (const apelo of apelos) {
    const t = await sequelize.transaction();
    try {
      const member = await svc._ensureMemberForApelo(apelo, t);
      if (!member || !member.id) {
        semMembro += 1;
        await t.rollback();
        continue;
      }

      const eraVisitante = member.status !== 'MEMBRO';
      const atividadeExistente = await MemberActivity.findOne({
        where: { memberId: member.id, activityType: 'CONSOLIDADO_CELULA' },
        transaction: t
      });

      if (APPLY) {
        await svc._promoverMembroConsolidado(member, t);
        await svc._ensureConsolidacaoActivity(member.id, apelo, t);
      }

      if (eraVisitante) {
        promovidos += 1;
        if (exemplos.length < 10) {
          exemplos.push(`${member.fullName} (${member.status} -> MEMBRO)`);
        }
      } else {
        jaMembro += 1;
      }
      if (!atividadeExistente) {
        atividadesCriadas += 1;
      }

      if (APPLY) {
        await t.commit();
      } else {
        await t.rollback();
      }
    } catch (err) {
      erros += 1;
      await t.rollback();
      if (erros <= 5) {
        console.error(`  erro no apelo ${apelo.id}: ${err.message}`);
      }
    }
  }

  console.log(`\n=== ${APPLY ? 'APLICADO' : 'SIMULACAO (nada gravado)'} ===`);
  console.log('membros promovidos (VISITANTE/etc -> MEMBRO):', promovidos);
  console.log('membros que ja eram MEMBRO:', jaMembro);
  console.log('atividades CONSOLIDADO_CELULA criadas:', atividadesCriadas);
  console.log('apelos sem membro resolvido:', semMembro);
  console.log('erros:', erros);
  if (exemplos.length) {
    console.log('exemplos de promocao:', exemplos.join(' | '));
  }
  if (!APPLY) {
    console.log('\n>>> DRY-RUN: rode com --apply para gravar.');
  }

  await sequelize.close();
})().catch((err) => {
  console.error('Falha no backfill:', err);
  process.exit(1);
});
