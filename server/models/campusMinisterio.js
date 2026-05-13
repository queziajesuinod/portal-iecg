const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CampusMinisterio extends Model {
    static associate(models) {
      if (models.Campus) {
        CampusMinisterio.belongsTo(models.Campus, { foreignKey: 'campusId', as: 'campus' });
      }
      if (models.Ministerio) {
        CampusMinisterio.belongsTo(models.Ministerio, { foreignKey: 'ministerioId', as: 'ministerio' });
      }
      if (models.Member) {
        CampusMinisterio.belongsTo(models.Member, { foreignKey: 'responsavelMemberId', as: 'responsavel' });
      }
    }
  }

  CampusMinisterio.init(
    {
      campusId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      ministerioId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      diasPadrao: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      responsavelMemberId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      validacaoAtiva: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'CampusMinisterio',
      tableName: 'campus_ministerio',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return CampusMinisterio;
};
