'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PaymentTransaction extends Model {
    static associate(models) {
      PaymentTransaction.belongsTo(models.Registration, { foreignKey: 'registrationId', as: 'registration' });
    }
  }

  PaymentTransaction.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    registrationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Registrations',
        key: 'id'
      }
    },
    transactionType: {
      type: DataTypes.ENUM(
        'authorization',
        'capture',
        'cancellation',
        'refund',
        'webhook'
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    cieloPaymentId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    responseData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Resposta completa da API Cielo'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'PaymentTransaction',
    tableName: 'PaymentTransactions',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return PaymentTransaction;
};
