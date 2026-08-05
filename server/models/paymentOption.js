const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PaymentOption extends Model {
    static associate(models) {
      PaymentOption.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }

  PaymentOption.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    paymentType: {
      type: DataTypes.ENUM('credit_card', 'pix', 'boleto', 'offline'),
      allowNull: false,
      comment: 'Tipo de pagamento'
    },
    maxInstallments: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Número máximo de parcelas (apenas para cartão)'
    },
    interestRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Taxa de juros aplicada uma vez por transação'
    },
    interestType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: true,
      defaultValue: 'percentage',
      comment: 'Tipo de juros: percentual ou fixo'
    },
    installmentInterestRates: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Mapa de juros por parcela (legado). Ex.: {"2": 1.5, "3": 2.1}'
    },
    absorverTaxaParcelamento: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'true = evento absorve a taxa de parcelamento (não repassa). '
        + 'false (padrão) = repassa automaticamente a taxa da Cielo por bandeira.'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'PaymentOption',
    tableName: 'PaymentOptions',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return PaymentOption;
};
