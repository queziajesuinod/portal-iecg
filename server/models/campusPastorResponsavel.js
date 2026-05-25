const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CampusPastorResponsavel extends Model {
    static associate(models) {
      if (models.Campus) {
        CampusPastorResponsavel.belongsTo(models.Campus, { foreignKey: 'campusId', as: 'campus' });
      }
      if (models.Member) {
        CampusPastorResponsavel.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      }
    }
  }

  CampusPastorResponsavel.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
      },
      campusId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      memberId: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'CampusPastorResponsavel',
      tableName: 'CampusPastoresResponsaveis',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return CampusPastorResponsavel;
};
