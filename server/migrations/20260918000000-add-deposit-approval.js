const schema = process.env.DB_SCHEMA || 'dev_iecg';

/**
 * Solicitacao de entrada abaixo do sinal minimo (pre-aprovacao).
 *  - Registrations: campos da solicitacao/aprovacao do deposito.
 *  - Events: allowBelowMinimumDeposit (toggle) + belowMinDepositTtlHours (prazo p/ pagar apos aprovar).
 * Idempotente (ADD COLUMN IF NOT EXISTS).
 */
module.exports = {
  async up(queryInterface) {
    const R = `"${schema}"."Registrations"`;
    const E = `"${schema}"."Events"`;
    await queryInterface.sequelize.query(`ALTER TABLE ${R} ADD COLUMN IF NOT EXISTS "depositApprovalStatus" VARCHAR(20) NOT NULL DEFAULT 'none';`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} ADD COLUMN IF NOT EXISTS "requestedDepositAmount" DECIMAL(10,2);`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} ADD COLUMN IF NOT EXISTS "approvedDepositAmount" DECIMAL(10,2);`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} ADD COLUMN IF NOT EXISTS "depositApprovedBy" UUID;`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} ADD COLUMN IF NOT EXISTS "depositApprovedAt" TIMESTAMP WITH TIME ZONE;`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} ADD COLUMN IF NOT EXISTS "depositOfferExpiresAt" TIMESTAMP WITH TIME ZONE;`);

    await queryInterface.sequelize.query(`ALTER TABLE ${E} ADD COLUMN IF NOT EXISTS "allowBelowMinimumDeposit" BOOLEAN NOT NULL DEFAULT false;`);
    await queryInterface.sequelize.query(`ALTER TABLE ${E} ADD COLUMN IF NOT EXISTS "belowMinDepositTtlHours" INTEGER NOT NULL DEFAULT 24;`);

    // Varredura de aprovacoes vencidas.
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS registrations_deposit_status_expires_idx ON ${R} ("depositApprovalStatus", "depositOfferExpiresAt");`);
  },

  async down(queryInterface) {
    const R = `"${schema}"."Registrations"`;
    const E = `"${schema}"."Events"`;
    await queryInterface.sequelize.query(`ALTER TABLE ${E} DROP COLUMN IF EXISTS "belowMinDepositTtlHours";`);
    await queryInterface.sequelize.query(`ALTER TABLE ${E} DROP COLUMN IF EXISTS "allowBelowMinimumDeposit";`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} DROP COLUMN IF EXISTS "depositOfferExpiresAt";`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} DROP COLUMN IF EXISTS "depositApprovedAt";`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} DROP COLUMN IF EXISTS "depositApprovedBy";`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} DROP COLUMN IF EXISTS "approvedDepositAmount";`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} DROP COLUMN IF EXISTS "requestedDepositAmount";`);
    await queryInterface.sequelize.query(`ALTER TABLE ${R} DROP COLUMN IF EXISTS "depositApprovalStatus";`);
  }
};
