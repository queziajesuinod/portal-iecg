'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'celulas' };
    await queryInterface.addColumn(table, 'ativo', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.sequelize.query(`UPDATE "${SCHEMA}"."celulas" SET "ativo" = true WHERE "ativo" IS NULL`);
  },

  async down(queryInterface) {
    const table = { schema: SCHEMA, tableName: 'celulas' };
    await queryInterface.removeColumn(table, 'ativo');
  }
};
