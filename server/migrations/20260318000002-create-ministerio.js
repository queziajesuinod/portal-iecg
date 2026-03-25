'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'ministerio' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
        },
        nome: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        ativo: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        exibeCriancas: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        exibeBebes: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        apeloDefault: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        exibeOnline: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'ministerio' });
  },
};
