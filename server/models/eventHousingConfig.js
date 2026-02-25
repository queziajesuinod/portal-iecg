const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventHousingConfig extends Model {
    static associate(models) {
      EventHousingConfig.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }

  EventHousingConfig.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      eventId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      rooms: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Array de quartos: [{id, name, capacity}]',
      },
      customRules: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'EventHousingConfig',
      tableName: 'EventHousingConfigs',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
      timestamps: true,
    }
  );

  return EventHousingConfig;
};
