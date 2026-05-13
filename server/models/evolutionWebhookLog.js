const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EvolutionWebhookLog extends Model {}

  EvolutionWebhookLog.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    event: { type: DataTypes.STRING(60), allowNull: true },
    instance: { type: DataTypes.STRING(100), allowNull: true },
    messageId: { type: DataTypes.STRING(255), allowNull: true },
    mappedStatus: { type: DataTypes.STRING(30), allowNull: true },
    updatedRecords: { type: DataTypes.JSONB, allowNull: true },
    rawPayload: { type: DataTypes.JSONB, allowNull: true }
  }, {
    sequelize,
    modelName: 'EvolutionWebhookLog',
    tableName: 'EvolutionWebhookLogs',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    updatedAt: false
  });

  return EvolutionWebhookLog;
};
