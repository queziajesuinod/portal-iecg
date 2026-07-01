const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CfmMensalidade extends Model {
    static associate(models) {
      if (models.CfmInscricao) {
        CfmMensalidade.belongsTo(models.CfmInscricao, { foreignKey: 'inscricaoId', as: 'inscricao' });
      }
    }
  }

  CfmMensalidade.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inscricaoId: { type: DataTypes.UUID, allowNull: false },
    competencia: { type: DataTypes.DATEONLY, allowNull: false },
    vencimento: { type: DataTypes.DATEONLY, allowNull: true },
    pago: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dataPagamento: { type: DataTypes.DATEONLY, allowNull: true },
    valor: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    observacao: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'CfmMensalidade',
    tableName: 'CfmMensalidades',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return CfmMensalidade;
};
