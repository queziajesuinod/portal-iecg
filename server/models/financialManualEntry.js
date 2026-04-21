const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FinancialManualEntry extends Model {
    static associate(models) {
      FinancialManualEntry.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      FinancialManualEntry.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
      FinancialManualEntry.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }

  FinancialManualEntry.init({
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
      type: DataTypes.ENUM('pix', 'credit_card', 'debit_card', 'boleto', 'cash', 'transfer', 'pos', 'manual', 'offline', 'other'),
      allowNull: false,
      defaultValue: 'pix'
    },
    isSettled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    entryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    settledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    receiptUrl: {
      type: DataTypes.STRING(500),
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
    modelName: 'FinancialManualEntry',
    tableName: 'FinancialManualEntries',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return FinancialManualEntry;
};
