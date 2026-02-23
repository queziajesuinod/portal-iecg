const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RegistrationPayment extends Model {
    static associate(models) {
      RegistrationPayment.belongsTo(models.Registration, { foreignKey: 'registrationId', as: 'registration' });
      RegistrationPayment.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      RegistrationPayment.belongsTo(models.User, { foreignKey: 'confirmedBy', as: 'confirmer' });
    }
  }

  RegistrationPayment.init({
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
    channel: {
      type: DataTypes.ENUM('ONLINE', 'OFFLINE'),
      allowNull: false,
      defaultValue: 'ONLINE'
    },
    method: {
      type: DataTypes.ENUM('pix', 'credit_card', 'boleto', 'cash', 'pos', 'transfer', 'manual'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
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
      type: DataTypes.STRING(50),
      allowNull: true
    },
    providerPaymentId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    providerPayload: {
      type: DataTypes.JSON,
      allowNull: true
    },
    pixQrCode: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pixQrCodeBase64: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    installments: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cardBrand: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    confirmedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    efiCommissionAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor da comissão enviada para Efí (1,5% do pagamento)'
    },
    efiCommissionSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Momento em que a comissão Efí foi disparada'
    },
    efiCommissionResponse: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Resposta completa enviada pela API Efí'
    },
  }, {
    sequelize,
    modelName: 'RegistrationPayment',
    tableName: 'RegistrationPayments',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return RegistrationPayment;
};
