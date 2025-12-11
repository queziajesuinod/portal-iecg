'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'observacao',
      {
        type: Sequelize.TEXT,
        allowNull: true
      }
    );

    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'dias_semana',
      {
        type: Sequelize.JSONB,
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'observacao'
    );

    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'dias_semana'
    );
  }
};
