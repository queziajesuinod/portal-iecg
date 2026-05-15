const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CelulaMembroVinculo extends Model {
    static associate(models) {
      if (models.Celula) {
        CelulaMembroVinculo.belongsTo(models.Celula, { foreignKey: 'celulaId', as: 'celula' });
      }
      if (models.Member) {
        CelulaMembroVinculo.belongsTo(models.Member, { foreignKey: 'membroId', as: 'membro' });
      }
    }
  }

  CelulaMembroVinculo.init(
    {
      id: {
        type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4
      },
      celulaId: { type: DataTypes.UUID, allowNull: false },
      membroId: { type: DataTypes.UUID, allowNull: false },
      papel: {
        type: DataTypes.ENUM('membro', 'lider', 'auxiliar', 'anfitria'),
        allowNull: false,
        defaultValue: 'membro'
      },
      dataEntrada: { type: DataTypes.DATEONLY, allowNull: false },
      dataSaida: { type: DataTypes.DATEONLY, allowNull: true },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      origem: {
        type: DataTypes.ENUM('apelo', 'manual', 'transferencia', 'lideranca', 'pre_cadastro'),
        allowNull: false,
        defaultValue: 'manual'
      },
      apeloId: { type: DataTypes.UUID, allowNull: true },
      observacao: { type: DataTypes.TEXT, allowNull: true }
    },
    {
      sequelize,
      modelName: 'CelulaMembroVinculo',
      tableName: 'CelulaMembroVinculos',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return CelulaMembroVinculo;
};
