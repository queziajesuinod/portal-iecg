const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MemberCargo extends Model {
    static associate(models) {
      if (models.Member) {
        MemberCargo.belongsTo(models.Member, { foreignKey: 'membroId', as: 'membro' });
      }
    }
  }

  MemberCargo.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
      },
      membroId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      cargo: {
        type: DataTypes.ENUM('lideranca_apostolica', 'pastor_geracao', 'pastor_campus'),
        allowNull: false
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      observacao: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'MemberCargo',
      tableName: 'MemberCargos',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return MemberCargo;
};
