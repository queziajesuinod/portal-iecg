const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NotificationSequenceStepRecipient extends Model {
    static associate(models) {
      NotificationSequenceStepRecipient.belongsTo(models.NotificationSequenceStep, { foreignKey: 'stepId', as: 'step' });
    }
  }

  NotificationSequenceStepRecipient.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    stepId: { type: DataTypes.UUID, allowNull: false },
    sourceType: { type: DataTypes.STRING(50), allowNull: true },
    sourceId: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING(200), allowNull: true },
    contact: { type: DataTypes.STRING(200), allowNull: false },
    resolvedMessage: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    errorMessage: { type: DataTypes.TEXT, allowNull: true },
    providerResponse: { type: DataTypes.JSONB, allowNull: true }
  }, {
    sequelize,
    modelName: 'NotificationSequenceStepRecipient',
    tableName: 'NotificationSequenceStepRecipients',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return NotificationSequenceStepRecipient;
};
