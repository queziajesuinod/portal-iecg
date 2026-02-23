'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';
const TABLE = { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' };

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(TABLE, 'cep_apelo', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn(TABLE, 'lat_apelo', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    await queryInterface.addColumn(TABLE, 'lon_apelo', {
      type: Sequelize.FLOAT,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(TABLE, 'lon_apelo');
    await queryInterface.removeColumn(TABLE, 'lat_apelo');
    await queryInterface.removeColumn(TABLE, 'cep_apelo');
  }
};
