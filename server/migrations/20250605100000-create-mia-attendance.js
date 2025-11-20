'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'mia_attendance_lists' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuid_generate_v4()')
        },
        titulo: {
          type: Sequelize.STRING,
          allowNull: false
        },
        dataReferencia: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        faixaEtariaMin: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        faixaEtariaMax: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        observacoes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      }
    );

    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'mia_attendance_presences' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuid_generate_v4()')
        },
        attendanceListId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { schema: SCHEMA, tableName: 'mia_attendance_lists' },
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        aposentadoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { schema: SCHEMA, tableName: 'aposentados_mia' },
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        presente: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        idadeNoEvento: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        observacao: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      }
    );

    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'mia_attendance_presences' },
      {
        fields: ['attendanceListId', 'aposentadoId'],
        type: 'unique',
        name: 'mia_attendance_unique_presence'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'mia_attendance_presences' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'mia_attendance_lists' });
  }
};
