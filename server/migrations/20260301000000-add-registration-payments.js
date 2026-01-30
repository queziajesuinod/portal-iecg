'use strict';

const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);

    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'registrationPaymentMode',
      {
        type: Sequelize.ENUM('SINGLE', 'BALANCE_DUE'),
        allowNull: false,
        defaultValue: 'SINGLE'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'minDepositAmount',
      {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      }
    );

    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'maxPaymentCount',
      {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    );

    await queryInterface.sequelize.query(
      `ALTER TYPE "${schema}"."enum_Registrations_paymentStatus" ADD VALUE IF NOT EXISTS 'partial';`
    );

    await queryInterface.createTable(
      {
        tableName: 'RegistrationPayments',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        registrationId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Registrations', schema },
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        channel: {
          type: Sequelize.ENUM('ONLINE', 'OFFLINE'),
          allowNull: false,
          defaultValue: 'ONLINE'
        },
        method: {
          type: Sequelize.ENUM('pix', 'credit_card', 'boleto', 'cash', 'pos', 'transfer', 'manual'),
          allowNull: false
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM(
            'pending',
            'authorized',
            'confirmed',
            'denied',
            'cancelled',
            'refunded',
            'expired'
          ),
          allowNull: false,
          defaultValue: 'pending'
        },
        provider: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        providerPaymentId: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        providerPayload: {
          type: Sequelize.JSON,
          allowNull: true
        },
        pixQrCode: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        pixQrCodeBase64: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        installments: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          }
        },
        confirmedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          }
        },
        confirmedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );

    await queryInterface.addIndex(
      { tableName: 'RegistrationPayments', schema },
      ['registrationId']
    );

    await queryInterface.addIndex(
      { tableName: 'RegistrationPayments', schema },
      ['providerPaymentId']
    );

    await queryInterface.addIndex(
      { tableName: 'RegistrationPayments', schema },
      ['status']
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'RegistrationPayments', schema });
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'registrationPaymentMode');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'minDepositAmount');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'maxPaymentCount');
  }
};
