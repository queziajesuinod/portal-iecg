const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NotificationSequenceStep extends Model {
    static associate(models) {
      NotificationSequenceStep.belongsTo(models.NotificationSequence, { foreignKey: 'sequenceId', as: 'sequence' });
      NotificationSequenceStep.belongsTo(models.NotificationTemplate, { foreignKey: 'templateId', as: 'template' });
      NotificationSequenceStep.hasMany(models.NotificationSequenceStepRecipient, { foreignKey: 'stepId', as: 'recipients' });
    }
  }

  NotificationSequenceStep.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    sequenceId: { type: DataTypes.UUID, allowNull: false },
    stepOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    name: { type: DataTypes.STRING(200), allowNull: true },
    templateId: { type: DataTypes.UUID, allowNull: true },
    customMessage: { type: DataTypes.TEXT, allowNull: true },
    scheduledAt: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    totalRecipients: { type: DataTypes.INTEGER, allowNull: true },
    totalSent: { type: DataTypes.INTEGER, allowNull: true },
    totalFailed: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    sequelize,
    modelName: 'NotificationSequenceStep',
    tableName: 'NotificationSequenceSteps',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return NotificationSequenceStep;
};
