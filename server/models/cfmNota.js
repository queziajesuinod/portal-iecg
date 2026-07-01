const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmNota extends Model {
    static associate(models) {
      if (models.CfmInscricao) {
        CfmNota.belongsTo(models.CfmInscricao, { foreignKey: 'inscricaoId', as: 'inscricao' });
      }
      if (models.CfmTurmaMateria) {
        CfmNota.belongsTo(models.CfmTurmaMateria, { foreignKey: 'turmaMateriaId', as: 'turmaMateria' });
      }
    }
  }

  CfmNota.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inscricaoId: { type: DataTypes.UUID, allowNull: false },
    turmaMateriaId: { type: DataTypes.UUID, allowNull: false },
    nota: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    aprovado: { type: DataTypes.BOOLEAN, allowNull: true },
    observacao: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'CfmNota',
    tableName: 'CfmNotas',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmNota;
};
