const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RegistrationAttendee extends Model {
    static associate(models) {
      RegistrationAttendee.belongsTo(models.Registration, { foreignKey: 'registrationId', as: 'registration' });
      RegistrationAttendee.belongsTo(models.EventBatch, { foreignKey: 'batchId', as: 'batch' });
    }
  }

  RegistrationAttendee.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    registrationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Registrations',
        key: 'id'
      }
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'EventBatches',
        key: 'id'
      },
      comment: 'Lote específico deste inscrito'
    },
    attendeeData: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Dados do inscrito conforme formulário personalizado'
    },
    attendeeNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Número sequencial do inscrito (1, 2, 3...)'
    },
  }, {
    sequelize,
    modelName: 'RegistrationAttendee',
    tableName: 'RegistrationAttendees',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return RegistrationAttendee;
};
