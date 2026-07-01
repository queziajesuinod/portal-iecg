const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmAula extends Model {
    static associate(models) {
      if (models.CfmTurma) {
        CfmAula.belongsTo(models.CfmTurma, { foreignKey: 'turmaId', as: 'turma' });
      }
      if (models.CfmTurmaMateria) {
        CfmAula.belongsTo(models.CfmTurmaMateria, { foreignKey: 'turmaMateriaId', as: 'turmaMateria' });
      }
      if (models.CfmAulaPresenca) {
        CfmAula.hasMany(models.CfmAulaPresenca, { foreignKey: 'aulaId', as: 'presencas' });
      }
    }
  }

  CfmAula.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    turmaId: { type: DataTypes.UUID, allowNull: false },
    turmaMateriaId: { type: DataTypes.UUID, allowNull: true },
    dataAula: { type: DataTypes.DATEONLY, allowNull: false },
    titulo: { type: DataTypes.STRING(120), allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    geradaAutomaticamente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    cancelada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    motivoCancelamento: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'CfmAula',
    tableName: 'CfmAulas',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmAula;
};
