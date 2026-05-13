const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CultoAusenciaJustificada extends Model {
    static associate(models) {
      if (models.Campus) {
        CultoAusenciaJustificada.belongsTo(models.Campus, { foreignKey: 'campusId', as: 'campus' });
      }
      if (models.Ministerio) {
        CultoAusenciaJustificada.belongsTo(models.Ministerio, { foreignKey: 'ministerioId', as: 'ministerio' });
      }
      if (models.User) {
        CultoAusenciaJustificada.belongsTo(models.User, { foreignKey: 'criadoPorUserId', as: 'criadoPor' });
      }
    }
  }

  CultoAusenciaJustificada.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      campusId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      ministerioId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      data: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      motivo: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
      criadoPorUserId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'CultoAusenciaJustificada',
      tableName: 'culto_ausencia_justificada',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return CultoAusenciaJustificada;
};
