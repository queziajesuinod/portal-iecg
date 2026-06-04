const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FinancialFeeConfig extends Model {
    static associate(models) {
      FinancialFeeConfig.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      FinancialFeeConfig.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
    }
  }

  FinancialFeeConfig.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    pixPercent: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    pixFixedFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    creditCardDefaultPercent: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0
    },
    creditCardFixedFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    creditCardInstallmentPercent: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    creditCardBrandRates: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    vigenteDe: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data de início da vigência desta configuração de taxas'
    },
    vigenteAte: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data de término da vigência (null = configuração ainda ativa)'
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
    modelName: 'FinancialFeeConfig',
    tableName: 'FinancialFeeConfigs',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return FinancialFeeConfig;
};
