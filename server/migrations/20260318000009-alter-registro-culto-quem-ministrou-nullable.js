'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      { schema: SCHEMA, tableName: 'registro_culto' },
      'quemMinistrou',
      {
        type: Sequelize.STRING(200),
        allowNull: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      { schema: SCHEMA, tableName: 'registro_culto' },
      'quemMinistrou',
      {
        type: Sequelize.STRING(200),
        allowNull: false,
        defaultValue: '',
      }
    );
  },
};
