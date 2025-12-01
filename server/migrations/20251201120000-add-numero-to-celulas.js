'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'celulas' },
      'numero',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'celulas' },
      'numero'
    );
  }
};
