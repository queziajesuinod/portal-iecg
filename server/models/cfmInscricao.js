const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmInscricao extends Model {
    static associate(models) {
      if (models.CfmTurma) {
        CfmInscricao.belongsTo(models.CfmTurma, { foreignKey: 'turmaId', as: 'turma' });
      }
      if (models.Member) {
        CfmInscricao.belongsTo(models.Member, { foreignKey: 'memberId', as: 'membro' });
      }
      if (models.CfmPresenca) {
        CfmInscricao.hasMany(models.CfmPresenca, { foreignKey: 'inscricaoId', as: 'presencas' });
      }
      if (models.CfmNota) {
        CfmInscricao.hasMany(models.CfmNota, { foreignKey: 'inscricaoId', as: 'notas' });
      }
      if (models.CfmMensalidade) {
        CfmInscricao.hasMany(models.CfmMensalidade, { foreignKey: 'inscricaoId', as: 'mensalidades' });
      }
    }
  }

  CfmInscricao.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    turmaId: { type: DataTypes.UUID, allowNull: false },
    memberId: { type: DataTypes.UUID, allowNull: true },
    nomeNaoMembro: { type: DataTypes.STRING(120), allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDENTE',
      validate: { isIn: [['PENDENTE', 'LISTA_ESPERA', 'ATIVO', 'CONCLUIDO', 'REPROVADO', 'DESISTENTE', 'CANCELADO']] },
    },
    pagamentoMatricula: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dataPagamento: { type: DataTypes.DATEONLY, allowNull: true },
    valorMatricula: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    aprovado: { type: DataTypes.BOOLEAN, allowNull: true },
    motivoReprovacao: { type: DataTypes.TEXT, allowNull: true },
    memberActivityId: { type: DataTypes.UUID, allowNull: true },
    marcoMilestoneId: { type: DataTypes.UUID, allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    dadosFormulario: { type: DataTypes.JSONB, allowNull: true },
  }, {
    sequelize,
    modelName: 'CfmInscricao',
    tableName: 'CfmInscricoes',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmInscricao;
};
