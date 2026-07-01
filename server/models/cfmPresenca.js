const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmPresenca extends Model {
    static associate(models) {
      if (models.CfmInscricao) {
        CfmPresenca.belongsTo(models.CfmInscricao, { foreignKey: 'inscricaoId', as: 'inscricao' });
      }
      if (models.CfmTurmaMateria) {
        CfmPresenca.belongsTo(models.CfmTurmaMateria, { foreignKey: 'turmaMateriaId', as: 'turmaMateria' });
      }
    }
  }

  CfmPresenca.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inscricaoId: { type: DataTypes.UUID, allowNull: false },
    turmaMateriaId: { type: DataTypes.UUID, allowNull: false },
    data: { type: DataTypes.DATEONLY, allowNull: false },
    presente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    observacao: { type: DataTypes.STRING(255), allowNull: true },
  }, {
    sequelize,
    modelName: 'CfmPresenca',
    tableName: 'CfmPresencas',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmPresenca;
};
