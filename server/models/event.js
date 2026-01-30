const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Event extends Model {
    static associate(models) {
      Event.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      Event.hasMany(models.EventBatch, { foreignKey: 'eventId', as: 'batches' });
      Event.hasMany(models.FormField, { foreignKey: 'eventId', as: 'formFields' });
      Event.hasMany(models.Registration, { foreignKey: 'eventId', as: 'registrations' });
      Event.hasMany(models.PaymentOption, { foreignKey: 'eventId', as: 'paymentOptions' });
    }
  }

  Event.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    addressNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    neighborhood: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cep: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    maxRegistrations: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = unlimited
    },
    currentRegistrations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    maxPerBuyer: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = sem limite
      comment: 'Quantidade máxima de inscrições por comprador'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    eventType: {
      type: DataTypes.ENUM('ACAMP', 'ENCONTRO', 'CONFERENCIA'),
      allowNull: false,
      defaultValue: 'ACAMP',
    },
    registrationPaymentMode: {
      type: DataTypes.ENUM('SINGLE', 'BALANCE_DUE'),
      allowNull: false,
      defaultValue: 'SINGLE',
      comment: 'Modo de pagamento das inscrições'
    },
    minDepositAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor mínimo de sinal para pré-inscrição'
    },
    maxPaymentCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Quantidade máxima de pagamentos permitidos'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
  }, {
    sequelize,
    modelName: 'Event',
    tableName: 'Events',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return Event;
};
