'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'registro_culto_ministro' },
      {
        registroCultoId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: { schema: SCHEMA, tableName: 'registro_culto' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        ministroId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: { schema: SCHEMA, tableName: 'ministro' }, key: 'id' },
          onDelete: 'CASCADE',
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
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'registro_culto_ministro' });
  },
};
