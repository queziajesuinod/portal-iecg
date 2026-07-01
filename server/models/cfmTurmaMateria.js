const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmTurmaMateria extends Model {
    static associate(models) {
      if (models.CfmTurma) {
        CfmTurmaMateria.belongsTo(models.CfmTurma, { foreignKey: 'turmaId', as: 'turma' });
      }
      if (models.CfmMateria) {
        CfmTurmaMateria.belongsTo(models.CfmMateria, { foreignKey: 'materiaId', as: 'materia' });
      }
      if (models.Member) {
        CfmTurmaMateria.belongsTo(models.Member, { foreignKey: 'mestreId', as: 'mestre' });
      }
      if (models.CfmPresenca) {
        CfmTurmaMateria.hasMany(models.CfmPresenca, { foreignKey: 'turmaMateriaId', as: 'presencas' });
      }
      if (models.CfmNota) {
        CfmTurmaMateria.hasMany(models.CfmNota, { foreignKey: 'turmaMateriaId', as: 'notas' });
      }
      if (models.CfmAula) {
        CfmTurmaMateria.hasMany(models.CfmAula, { foreignKey: 'turmaMateriaId', as: 'aulas' });
      }
    }
  }

  CfmTurmaMateria.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    turmaId: { type: DataTypes.UUID, allowNull: false },
    materiaId: { type: DataTypes.UUID, allowNull: false },
    mestreId: { type: DataTypes.UUID, allowNull: true },
    periodoInicio: { type: DataTypes.DATEONLY, allowNull: true },
    periodoFim: { type: DataTypes.DATEONLY, allowNull: true },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'CfmTurmaMateria',
    tableName: 'CfmTurmaMaterias',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmTurmaMateria;
};
