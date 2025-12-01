'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'apelos_direcionados_historico' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()')
        },
        apelo_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        celula_id_origem: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { schema: SCHEMA, tableName: 'celulas' },
            key: 'id'
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL'
        },
        celula_id_destino: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { schema: SCHEMA, tableName: 'celulas' },
            key: 'id'
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL'
        },
        data_movimento: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        motivo: {
          type: Sequelize.STRING,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'apelos_direcionados_historico' });
  }
};
