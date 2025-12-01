'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'cidade_apelo',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'estado_apelo',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'cidade_apelo'
    );
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'estado_apelo'
    );
  }
};
