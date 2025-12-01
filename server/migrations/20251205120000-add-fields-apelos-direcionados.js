'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'direcionado_celula',
      {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null
      }
    );
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'idade',
      {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    );
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'bairro_proximo',
      {
        type: Sequelize.JSONB,
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'direcionado_celula'
    );
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'idade'
    );
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'bairro_proximo'
    );
  }
};
