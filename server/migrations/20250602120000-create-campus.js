'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'Campus' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        nome: {
          type: Sequelize.STRING,
          allowNull: false
        },
        endereco: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        bairro: {
          type: Sequelize.STRING,
          allowNull: true
        },
        cidade: {
          type: Sequelize.STRING,
          allowNull: true
        },
        estado: {
          type: Sequelize.STRING,
          allowNull: true
        },
        pastoresResponsaveis: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        lat: {
          type: Sequelize.STRING,
          allowNull: true
        },
        lon: {
          type: Sequelize.STRING,
          allowNull: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        }
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'Campus' });
  }
};
