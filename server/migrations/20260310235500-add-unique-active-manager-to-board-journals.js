'use strict';

module.exports = {
  async up(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_board_journals_active_manager
      ON "${schema}"."BoardJournals" ("managerUserId")
      WHERE "managerUserId" IS NOT NULL AND "isActive" = true
    `);
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "${schema}"."uq_board_journals_active_manager"
    `);
  }
};
