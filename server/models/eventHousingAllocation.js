const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventHousingAllocation extends Model {
    static associate(models) {
      EventHousingAllocation.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventHousingAllocation.belongsTo(models.RegistrationAttendee, {
        foreignKey: 'attendeeId',
        as: 'attendee',
      });
    }
  }

  EventHousingAllocation.init(
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
      attendeeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      roomName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      slotLabel: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      idade: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      lider_de_celula: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      llmReasoning: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      generatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'EventHousingAllocation',
      tableName: 'EventHousingAllocations',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
      timestamps: true,
    }
  );

  return EventHousingAllocation;
};
