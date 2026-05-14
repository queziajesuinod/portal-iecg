const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CelulaPresencaPonto extends Model {
    static associate(models) {
      if (models.Member) {
        CelulaPresencaPonto.belongsTo(models.Member, { foreignKey: 'membroId', as: 'membro' });
      }
      if (models.CelulaReuniao) {
        CelulaPresencaPonto.belongsTo(models.CelulaReuniao, { foreignKey: 'reuniaoId', as: 'reuniao' });
      }
    }
  }

  CelulaPresencaPonto.init(
    {
      id: {
        type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4
      },
      membroId: { type: DataTypes.UUID, allowNull: false },
      reuniaoId: { type: DataTypes.UUID, allowNull: false },
      pontosBase: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      pontosBonus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      motivoBonus: { type: DataTypes.STRING(100), allowNull: true }
    },
    {
      sequelize,
      modelName: 'CelulaPresencaPonto',
      tableName: 'CelulaPresencaPontos',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return CelulaPresencaPonto;
};
