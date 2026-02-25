const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventTeamsConfig extends Model {
    static associate(models) {
      EventTeamsConfig.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }

  EventTeamsConfig.init(
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
      teamsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      playersPerTeam: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      teamNames: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      customRules: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'EventTeamsConfig',
      tableName: 'EventTeamsConfigs',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
      timestamps: true,
    }
  );

  return EventTeamsConfig;
};
