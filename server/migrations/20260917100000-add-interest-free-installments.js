const schema = process.env.DB_SCHEMA || 'dev_iecg';

/**
 * "Parcelas sem juros até X" por forma de pagamento.
 *  - interestFreeUpToInstallments: nro de parcelas sem juros (default 1 = juros a partir de 2x,
 *    comportamento atual). Ex.: 3 => 1x/2x/3x sem juros; juros a partir de 4x.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."PaymentOptions" ADD COLUMN IF NOT EXISTS "interestFreeUpToInstallments" INTEGER NOT NULL DEFAULT 1;`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."PaymentOptions" DROP COLUMN IF EXISTS "interestFreeUpToInstallments";`);
  }
};
