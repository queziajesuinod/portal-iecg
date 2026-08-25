const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventCoordinatorLog extends Model {
    static associate(models) {
      EventCoordinatorLog.belongsTo(models.EventCoordinator, { foreignKey: 'coordinatorId', as: 'coordinator' });
    }
  }

  EventCoordinatorLog.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    coordinatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'EventCoordinators', key: 'id' }
    },
    channel: {
      type: DataTypes.ENUM('email', 'whatsapp'),
      allowNull: false,
    },
    trigger: {
      type: DataTypes.ENUM('scheduled', 'manual', 'test'),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    status: {
      type: DataTypes.ENUM('sent', 'failed'),
      allowNull: false,
    },
    recipient: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    snapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },
  }, {
    sequelize,
    modelName: 'EventCoordinatorLog',
    tableName: 'EventCoordinatorLogs',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventCoordinatorLog;
};
