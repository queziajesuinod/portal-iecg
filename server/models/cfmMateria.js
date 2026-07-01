const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmMateria extends Model {
    static associate(models) {
      if (models.CfmEscola) {
        CfmMateria.belongsTo(models.CfmEscola, { foreignKey: 'escolaId', as: 'escola' });
      }
      if (models.CfmModulo) {
        CfmMateria.belongsTo(models.CfmModulo, { foreignKey: 'moduloId', as: 'modulo' });
      }
      if (models.CfmTurmaMateria) {
        CfmMateria.hasMany(models.CfmTurmaMateria, { foreignKey: 'materiaId', as: 'turmaMaterias' });
      }
    }
  }

  CfmMateria.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    escolaId: { type: DataTypes.UUID, allowNull: false },
    moduloId: { type: DataTypes.UUID, allowNull: true },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    sequelize,
    modelName: 'CfmMateria',
    tableName: 'CfmMaterias',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmMateria;
};
