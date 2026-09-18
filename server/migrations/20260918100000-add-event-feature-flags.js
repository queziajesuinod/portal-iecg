const schema = process.env.DB_SCHEMA || 'dev_iecg';

/**
 * Flags de recursos do evento: hospedagem e times (o botao so aparece se habilitado).
 * (Termo = requiresLiabilityTerm; Lista de espera = waitlistEnabled ja existem.)
 * Preserva eventos existentes: marca habilitado onde ja existe config de hospedagem/times.
 */
module.exports = {
  async up(queryInterface) {
    const E = `"${schema}"."Events"`;
    await queryInterface.sequelize.query(`ALTER TABLE ${E} ADD COLUMN IF NOT EXISTS "housingEnabled" BOOLEAN NOT NULL DEFAULT false;`);
    await queryInterface.sequelize.query(`ALTER TABLE ${E} ADD COLUMN IF NOT EXISTS "teamsEnabled" BOOLEAN NOT NULL DEFAULT false;`);

    // Preserva eventos que ja usam hospedagem/times.
    await queryInterface.sequelize.query(`
      UPDATE ${E} e SET "housingEnabled" = true
      WHERE EXISTS (SELECT 1 FROM "${schema}"."EventHousingConfigs" h WHERE h."eventId" = e."id");
    `);
    await queryInterface.sequelize.query(`
      UPDATE ${E} e SET "teamsEnabled" = true
      WHERE EXISTS (SELECT 1 FROM "${schema}"."EventTeamsConfigs" t WHERE t."eventId" = e."id");
    `);
  },

  async down(queryInterface) {
    const E = `"${schema}"."Events"`;
    await queryInterface.sequelize.query(`ALTER TABLE ${E} DROP COLUMN IF EXISTS "teamsEnabled";`);
    await queryInterface.sequelize.query(`ALTER TABLE ${E} DROP COLUMN IF EXISTS "housingEnabled";`);
  }
};
