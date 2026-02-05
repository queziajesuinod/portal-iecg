const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventCheckIn extends Model {
    static associate(models) {
      EventCheckIn.belongsTo(models.Registration, { foreignKey: 'registrationId', as: 'registration' });
      EventCheckIn.belongsTo(models.RegistrationAttendee, { foreignKey: 'attendeeId', as: 'attendee' });
      EventCheckIn.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventCheckIn.belongsTo(models.EventCheckInSchedule, { foreignKey: 'scheduleId', as: 'schedule' });
      EventCheckIn.belongsTo(models.EventCheckInStation, { foreignKey: 'stationId', as: 'station' });
      EventCheckIn.belongsTo(models.User, { foreignKey: 'checkInBy', as: 'staff' });
    }
  }

  EventCheckIn.init({
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
    attendeeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'RegistrationAttendees',
        key: 'id'
      },
      comment: 'ID do inscrito específico (se aplicável)'
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    scheduleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'EventCheckInSchedules',
        key: 'id'
      },
      comment: 'Agendamento em que o check-in foi realizado'
    },
    stationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'EventCheckInStations',
        key: 'id'
      },
      comment: 'Estação onde o check-in foi realizado'
    },
    checkInMethod: {
      type: DataTypes.ENUM('manual', 'qrcode', 'nfc'),
      allowNull: false,
      comment: 'Método utilizado para o check-in'
    },
    checkInAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Data/hora do check-in'
    },
    checkInBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Staff que realizou o check-in (apenas para manual)'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: 'Latitude onde o check-in foi realizado'
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: 'Longitude onde o check-in foi realizado'
    },
    deviceInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Informações do dispositivo usado'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observações sobre o check-in'
    },
  }, {
    sequelize,
    modelName: 'EventCheckIn',
    tableName: 'EventCheckIns',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventCheckIn;
};
