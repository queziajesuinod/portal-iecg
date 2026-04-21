'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.createTable(
      { tableName: 'FinancialManualEntries', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        description: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Events', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        paymentMethod: {
          type: Sequelize.ENUM('pix', 'credit_card', 'debit_card', 'boleto', 'cash', 'transfer', 'pos', 'manual', 'offline', 'other'),
          allowNull: false,
          defaultValue: 'pix'
        },
        isSettled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        entryDate: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        settledAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        receiptUrl: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        updatedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'FinancialManualEntries', schema });
  }
};
