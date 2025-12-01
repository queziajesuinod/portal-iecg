'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'apelos_direcionados_historico' };
    await queryInterface.addColumn(table, 'tipo_evento', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'CELULA'
    });
    await queryInterface.addColumn(table, 'status_anterior', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn(table, 'status_novo', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    const table = { schema: SCHEMA, tableName: 'apelos_direcionados_historico' };
    await queryInterface.removeColumn(table, 'status_novo');
    await queryInterface.removeColumn(table, 'status_anterior');
    await queryInterface.removeColumn(table, 'tipo_evento');
  }
};
