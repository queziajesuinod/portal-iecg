const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CelulaPresenca extends Model {
    static associate(models) {
      if (models.CelulaReuniao) {
        CelulaPresenca.belongsTo(models.CelulaReuniao, { foreignKey: 'reuniaoId', as: 'reuniao' });
      }
      if (models.Member) {
        CelulaPresenca.belongsTo(models.Member, { foreignKey: 'membroId', as: 'membro' });
      }
      if (models.PreCadastroPresenca) {
        CelulaPresenca.belongsTo(models.PreCadastroPresenca, { foreignKey: 'preCadastroId', as: 'preCadastro' });
      }
      if (models.CelulaPresencaPonto) {
        CelulaPresenca.hasOne(models.CelulaPresencaPonto, { foreignKey: 'reuniaoId', sourceKey: 'reuniaoId', as: 'ponto' });
      }
    }
  }

  CelulaPresenca.init(
    {
      id: {
        type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4
      },
      reuniaoId: { type: DataTypes.UUID, allowNull: false },
      membroId: { type: DataTypes.UUID, allowNull: true },
      preCadastroId: { type: DataTypes.UUID, allowNull: true },
      presente: { type: DataTypes.BOOLEAN, allowNull: true },
      registradoEm: { type: DataTypes.DATE, allowNull: true }
    },
    {
      sequelize,
      modelName: 'CelulaPresenca',
      tableName: 'CelulaPresencas',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return CelulaPresenca;
};
