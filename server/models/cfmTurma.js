const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmTurma extends Model {
    static associate(models) {
      if (models.CfmEscola) {
        CfmTurma.belongsTo(models.CfmEscola, { foreignKey: 'escolaId', as: 'escola' });
      }
      if (models.CfmModulo) {
        CfmTurma.belongsTo(models.CfmModulo, { foreignKey: 'moduloId', as: 'modulo' });
      }
      if (models.Campus) {
        CfmTurma.belongsTo(models.Campus, { foreignKey: 'campusId', as: 'campus' });
      }
      if (models.CfmTurmaMateria) {
        CfmTurma.hasMany(models.CfmTurmaMateria, { foreignKey: 'turmaId', as: 'turmaMaterias' });
      }
      if (models.CfmInscricao) {
        CfmTurma.hasMany(models.CfmInscricao, { foreignKey: 'turmaId', as: 'inscricoes' });
      }
      if (models.CfmAula) {
        CfmTurma.hasMany(models.CfmAula, { foreignKey: 'turmaId', as: 'aulas' });
      }
    }
  }

  CfmTurma.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    escolaId: { type: DataTypes.UUID, allowNull: false },
    moduloId: { type: DataTypes.UUID, allowNull: true },
    numeracao: { type: DataTypes.STRING(30), allowNull: false },
    campusId: { type: DataTypes.UUID, allowNull: true },
    periodoInicio: { type: DataTypes.DATEONLY, allowNull: false },
    periodoFim: { type: DataTypes.DATEONLY, allowNull: false },
    vagasMax: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ABERTA',
      validate: { isIn: [['ABERTA', 'EM_ANDAMENTO', 'ENCERRADA', 'CANCELADA']] },
    },
    diaSemana: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      validate: { min: 0, max: 6 },
      comment: '0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab',
    },
    activityTypeCode: { type: DataTypes.STRING(80), allowNull: true },
    marcoConclussaoCode: { type: DataTypes.STRING(80), allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'CfmTurma',
    tableName: 'CfmTurmas',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmTurma;
};
