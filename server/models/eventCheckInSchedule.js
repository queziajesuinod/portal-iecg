const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventCheckInSchedule extends Model {
    static associate(models) {
      EventCheckInSchedule.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventCheckInSchedule.hasMany(models.EventCheckIn, { foreignKey: 'scheduleId', as: 'checkIns' });
    }
  }

  EventCheckInSchedule.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nome do agendamento (ex: Credenciamento Manhã)'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Data/hora de início do período de check-in'
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Data/hora de fim do período de check-in'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Se o agendamento está ativo'
    },
    notificationGroupId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID do grupo de notificação associado'
    },
  }, {
    sequelize,
    modelName: 'EventCheckInSchedule',
    tableName: 'EventCheckInSchedules',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventCheckInSchedule;
};
