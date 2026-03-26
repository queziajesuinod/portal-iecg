const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FinancialExpense extends Model {
    static associate(models) {
      FinancialExpense.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      FinancialExpense.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
      FinancialExpense.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }

  FinancialExpense.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.ENUM('pix', 'credit_card', 'debit_card', 'boleto', 'cash', 'transfer', 'other'),
      allowNull: false,
      defaultValue: 'pix'
    },
    isSettled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    settledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'unico'
    },
    entradaAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    entradaPaymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    entradaDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    entradaIsSettled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    entradaSettledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    quitacaoAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    quitacaoPaymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    quitacaoDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    quitacaoIsSettled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    quitacaoSettledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    supplier: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FinancialExpense',
    tableName: 'FinancialExpenses',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return FinancialExpense;
};
