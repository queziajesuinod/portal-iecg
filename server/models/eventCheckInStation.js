const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventCheckInStation extends Model {
    static associate(models) {
      EventCheckInStation.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventCheckInStation.hasMany(models.EventCheckIn, { foreignKey: 'stationId', as: 'checkIns' });
    }
  }

  EventCheckInStation.init({
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
      comment: 'Nome do ponto de check-in (ex: Entrada Principal)'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: 'Latitude do ponto de check-in'
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: 'Longitude do ponto de check-in'
    },
    nfcTagId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID da tag NFC associada'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Se a estação está ativa'
    },
  }, {
    sequelize,
    modelName: 'EventCheckInStation',
    tableName: 'EventCheckInStations',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventCheckInStation;
};
