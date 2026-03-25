'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'Campus' },
      'transmiteOnline',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'Campus' },
      'transmiteOnline'
    );
  },
};
