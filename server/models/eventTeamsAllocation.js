const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventTeamsAllocation extends Model {
    static associate(models) {
      EventTeamsAllocation.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventTeamsAllocation.belongsTo(models.RegistrationAttendee, {
        foreignKey: 'attendeeId',
        as: 'attendee',
      });
    }
  }

  EventTeamsAllocation.init(
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
      teamId: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      teamName: {
        type: DataTypes.STRING(255),
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
      modelName: 'EventTeamsAllocation',
      tableName: 'EventTeamsAllocations',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
      timestamps: true,
    }
  );

  return EventTeamsAllocation;
};
