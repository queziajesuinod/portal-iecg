/**
 * Semeia a configuração de taxas do Financeiro com a tabela oficial da Cielo.
 *
 * A tabela da Cielo informa a taxa TOTAL por bandeira e parcela (MDR + prazo de
 * recebimento já somados). Como o portal calcula:
 *
 *     taxa = MDR[bandeira][parcela] + RR[parcela]
 *
 * colocamos a taxa TOTAL da Cielo no MDR por bandeira/parcela e deixamos o RR
 * (prazo) zerado. Assim o cálculo do portal bate exatamente com o extrato Cielo.
 *
 * Cria uma NOVA VIGÊNCIA a partir de hoje (preserva o histórico e encerra a
 * config anterior). Preserva as taxas de PIX vigentes.
 *
 * Uso: node server/scripts/seedCieloFeeConfig.js
 */
const models = require('../models');
const financialService = require('../services/financialService');

const { sequelize } = models;

// Taxa TOTAL Cielo (%) por parcela (1x = crédito à vista). Colunas iguais agrupadas.
const VISA_MASTER_DINERS = {
  1: 5.60,
  2: 9.39,
  3: 10.59,
  4: 11.83,
  5: 13.04,
  6: 14.25,
  7: 15.49,
  8: 16.71,
  9: 17.91,
  10: 19.09,
  11: 20.25,
  12: 21.39
};

const ELO_AMEX_HIPERCARD = {
  1: 6.51,
  2: 10.10,
  3: 11.30,
  4: 12.54,
  5: 13.75,
  6: 14.96,
  7: 16.20,
  8: 17.42,
  9: 18.62,
  10: 19.80,
  11: 20.96,
  12: 22.10
};

const AGIPLAN_BANESCARD = {
  1: 5.71,
  2: 9.39,
  3: 10.59,
  4: 11.83,
  5: 13.04,
  6: 14.25,
  7: 15.49,
  8: 16.71,
  9: 17.91,
  10: 19.09,
  11: 20.25,
  12: 21.39
};

// Taxa mínima por transação de cartão (R$).
const MINIMUM_FEE = 0.40;

function montarBandeira(installmentPercent) {
  return {
    defaultPercent: installmentPercent[1],
    minimumFee: MINIMUM_FEE,
    installmentPercent
  };
}

async function main() {
  const atual = financialService.serializeFeeConfig(await financialService.getActiveFeeConfig());

  const payload = {
    // Preserva as taxas de PIX vigentes.
    pixPercent: atual.pixPercent,
    pixFixedFee: atual.pixFixedFee,
    // Fallback quando a bandeira não for identificada (usa crédito à vista Visa/Master).
    creditCardDefaultPercent: VISA_MASTER_DINERS[1],
    creditCardFixedFee: MINIMUM_FEE,
    // RR (prazo) zerado: a taxa total já está embutida no MDR por bandeira.
    creditCardInstallmentPercent: {},
    creditCardBrandRates: {
      visa: montarBandeira(VISA_MASTER_DINERS),
      master: montarBandeira(VISA_MASTER_DINERS),
      diners: montarBandeira(VISA_MASTER_DINERS),
      elo: montarBandeira(ELO_AMEX_HIPERCARD),
      amex: montarBandeira(ELO_AMEX_HIPERCARD),
      hipercard: montarBandeira(ELO_AMEX_HIPERCARD),
      agiplan: montarBandeira(AGIPLAN_BANESCARD),
      banescard: montarBandeira(AGIPLAN_BANESCARD)
    }
  };

  const nova = await financialService.criarNovaVigencia(payload, null);
  console.log('Nova vigência de taxas criada a partir de hoje (taxa total Cielo no MDR, RR = 0):');
  console.log(JSON.stringify(nova, null, 2));
}

main()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Falha ao semear taxas Cielo:', err);
    try {
      await sequelize.close();
    } catch (closeErr) {
      // ignore
    }
    process.exit(1);
  });
