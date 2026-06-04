/* eslint-disable no-console */
/**
 * Backfill: separa os juros de parcelamento de cartão que foram
 * "baked" dentro de RegistrationPayment.amount em vez de ficarem em taxa.
 *
 * Problema: pagamentos históricos de cartão em N parcelas gravaram o valor
 * total com juros (amount = base + juros) e deixaram taxa = 0.
 * Resultado esperado: amount = preço base (originalPrice - discountAmount),
 *                     taxa   = juros de parcelamento repassados ao comprador.
 *
 * Também corrige Registration.finalPrice que foi atualizado para o valor
 * inflado com juros, devolvendo-o ao preço correto (originalPrice - discountAmount).
 *
 * Uso:
 *   node server/scripts/backfillTaxaParcelamentoCartao.js            # executa
 *   node server/scripts/backfillTaxaParcelamentoCartao.js --dry-run  # só mostra
 */

require('dotenv').config();
const { sequelize, RegistrationPayment, Registration } = require('../models');

const isDryRun = process.argv.includes('--dry-run');
const TOLERANCIA = 0.01; // diferença mínima para ser considerado candidato

function arredondar(valor) {
  return Number(Number(valor || 0).toFixed(2));
}

async function run() {
  console.log(`\n=== backfillTaxaParcelamentoCartao ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);

  await sequelize.authenticate();

  // Busca todos os pagamentos cartão confirmados com taxa = 0
  const pagamentos = await RegistrationPayment.findAll({
    where: { method: 'credit_card', status: 'confirmed', taxa: 0 },
    include: [{
      model: Registration,
      as: 'registration',
      attributes: ['id', 'finalPrice', 'originalPrice', 'discountAmount'],
    }],
  });

  console.log(`Pagamentos cartão confirmados com taxa=0 encontrados: ${pagamentos.length}`);

  let atualizados = 0;
  let ignorados = 0;
  const linhas = [];

  for (const pagamento of pagamentos) {
    const reg = pagamento.registration;
    if (!reg) {
      ignorados += 1;
      linhas.push(`  IGNORADO (sem registration): payment ${pagamento.id}`);
      continue;
    }

    const originalPrice = arredondar(reg.originalPrice);
    const discountAmount = arredondar(reg.discountAmount || 0);
    const precoBase = arredondar(originalPrice - discountAmount);
    const amountAtual = arredondar(pagamento.amount);
    const jurosCalculados = arredondar(amountAtual - precoBase);

    if (jurosCalculados <= TOLERANCIA) {
      // Sem juros baked — não precisa alterar
      ignorados += 1;
      continue;
    }

    linhas.push(
      `  payment ${pagamento.id} | ${pagamento.installments}x `
      + `| amount: ${amountAtual} → ${precoBase} | taxa: 0 → ${jurosCalculados} `
      + `| reg finalPrice: ${arredondar(reg.finalPrice)} → ${precoBase}`
    );

    if (!isDryRun) {
      const transaction = await sequelize.transaction();
      try {
        await pagamento.update({ amount: precoBase, taxa: jurosCalculados }, { transaction });
        // Devolve finalPrice da inscrição ao preço correto (sem juros de parcelamento)
        if (arredondar(reg.finalPrice) !== precoBase) {
          await reg.update({ finalPrice: precoBase }, { transaction });
        }
        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        linhas.push(`  ERRO ao atualizar payment ${pagamento.id}: ${err.message}`);
        ignorados += 1;
        continue;
      }
    }
    atualizados += 1;
  }

  linhas.forEach((l) => console.log(l));

  console.log('\n══════════════════════════════════════');
  console.log(`Atualizados : ${atualizados}`);
  console.log(`Ignorados   : ${ignorados}`);
  if (isDryRun) console.log('[DRY-RUN] Nenhuma alteração foi gravada.');
  console.log('══════════════════════════════════════\n');

  await sequelize.close();
}

run().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
