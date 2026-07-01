const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmAulaPresenca extends Model {
    static associate(models) {
      if (models.CfmAula) {
        CfmAulaPresenca.belongsTo(models.CfmAula, { foreignKey: 'aulaId', as: 'aula' });
      }
      if (models.CfmInscricao) {
        CfmAulaPresenca.belongsTo(models.CfmInscricao, { foreignKey: 'inscricaoId', as: 'inscricao' });
      }
    }
  }

  CfmAulaPresenca.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    aulaId: { type: DataTypes.UUID, allowNull: false },
    inscricaoId: { type: DataTypes.UUID, allowNull: false },
    presente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    observacao: { type: DataTypes.STRING(255), allowNull: true },
  }, {
    sequelize,
    modelName: 'CfmAulaPresenca',
    tableName: 'CfmAulaPresencas',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmAulaPresenca;
};
