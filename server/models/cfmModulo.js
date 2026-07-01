const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmModulo extends Model {
    static associate(models) {
      if (models.CfmEscola) {
        CfmModulo.belongsTo(models.CfmEscola, { foreignKey: 'escolaId', as: 'escola' });
      }
      if (models.CfmMateria) {
        CfmModulo.hasMany(models.CfmMateria, { foreignKey: 'moduloId', as: 'materias' });
      }
      if (models.CfmTurma) {
        CfmModulo.hasMany(models.CfmTurma, { foreignKey: 'moduloId', as: 'turmas' });
      }
    }
  }

  CfmModulo.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    escolaId: { type: DataTypes.UUID, allowNull: false },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    sequelize,
    modelName: 'CfmModulo',
    tableName: 'CfmModulos',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmModulo;
};
