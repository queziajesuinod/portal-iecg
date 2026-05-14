const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CelulaReuniao extends Model {
    static associate(models) {
      if (models.Celula) {
        CelulaReuniao.belongsTo(models.Celula, { foreignKey: 'celulaId', as: 'celula' });
      }
      if (models.Member) {
        CelulaReuniao.belongsTo(models.Member, { foreignKey: 'encerradaPorId', as: 'encerradaPor' });
      }
      if (models.CelulaPresenca) {
        CelulaReuniao.hasMany(models.CelulaPresenca, { foreignKey: 'reuniaoId', as: 'presencas' });
      }
    }
  }

  CelulaReuniao.init(
    {
      id: {
        type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4
      },
      celulaId: { type: DataTypes.UUID, allowNull: false },
      data: { type: DataTypes.DATE, allowNull: false },
      status: {
        type: DataTypes.ENUM('agendada', 'aberta', 'encerrada', 'cancelada'),
        allowNull: false,
        defaultValue: 'agendada'
      },
      origem: {
        type: DataTypes.ENUM('automatica', 'manual'),
        allowNull: false,
        defaultValue: 'automatica'
      },
      motivoCancelamento: { type: DataTypes.TEXT, allowNull: true },
      encerradaPorId: { type: DataTypes.UUID, allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    },
    {
      sequelize,
      modelName: 'CelulaReuniao',
      tableName: 'CelulaReunioes',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return CelulaReuniao;
};
