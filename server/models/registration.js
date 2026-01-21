const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Registration extends Model {
    static associate(models) {
      Registration.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      Registration.belongsTo(models.EventBatch, { foreignKey: 'batchId', as: 'batch' });
      Registration.belongsTo(models.Coupon, { foreignKey: 'couponId', as: 'coupon' });
      Registration.hasMany(models.RegistrationAttendee, { foreignKey: 'registrationId', as: 'attendees' });
      Registration.hasMany(models.PaymentTransaction, { foreignKey: 'registrationId', as: 'transactions' });
    }
  }

  Registration.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    orderCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Código único do pedido (ex: REG-20260121-A3B5C7)'
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: true, // Agora cada inscrito tem seu lote (RegistrationAttendees.batchId)
      references: {
        model: 'EventBatches',
        key: 'id'
      }
    },
    couponId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Coupons',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Quantidade de inscrições neste pedido'
    },
    buyerData: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Dados do comprador (preenchido 1 vez)'
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Preço original (sem desconto)'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Valor do desconto aplicado'
    },
    finalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Preço final (após desconto)'
    },
    paymentStatus: {
      type: DataTypes.ENUM(
        'pending',
        'authorized',
        'confirmed',
        'denied',
        'cancelled',
        'refunded'
      ),
      defaultValue: 'pending',
    },
    paymentId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'PaymentId retornado pela Cielo'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Método de pagamento usado'
    },
    cieloResponse: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Resposta completa da API Cielo'
    },
    pixQrCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Código PIX (copia e cola)'
    },
    pixQrCodeBase64: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'QR Code PIX em base64 para exibição'
    },
  }, {
    sequelize,
    modelName: 'Registration',
    tableName: 'Registrations',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return Registration;
};
