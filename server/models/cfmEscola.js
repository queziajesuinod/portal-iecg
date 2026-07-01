const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmEscola extends Model {
    static associate(models) {
      if (models.CfmModulo) {
        CfmEscola.hasMany(models.CfmModulo, { foreignKey: 'escolaId', as: 'modulos' });
      }
      if (models.CfmMateria) {
        CfmEscola.hasMany(models.CfmMateria, { foreignKey: 'escolaId', as: 'materias' });
      }
      if (models.CfmTurma) {
        CfmEscola.hasMany(models.CfmTurma, { foreignKey: 'escolaId', as: 'turmas' });
      }
    }
  }

  CfmEscola.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    temModulos: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    sequelize,
    modelName: 'CfmEscola',
    tableName: 'CfmEscolas',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmEscola;
};
