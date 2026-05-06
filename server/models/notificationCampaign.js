const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NotificationCampaign extends Model {
    static associate(models) {
      NotificationCampaign.belongsTo(models.NotificationTemplate, { foreignKey: 'templateId', as: 'template' });
      NotificationCampaign.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      NotificationCampaign.hasMany(models.NotificationCampaignRecipient, { foreignKey: 'campaignId', as: 'recipients' });
    }
  }

  NotificationCampaign.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(200), allowNull: false },
    channel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'whatsapp' },
    templateId: { type: DataTypes.UUID, allowNull: true },
    customMessage: { type: DataTypes.TEXT, allowNull: true },
    audienceType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'filter' },
    audienceConfig: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    scheduledAt: { type: DataTypes.DATE, allowNull: true },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    totalRecipients: { type: DataTypes.INTEGER, allowNull: true },
    totalSent: { type: DataTypes.INTEGER, allowNull: true },
    totalFailed: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    sendDelayMs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
    recurrenceType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'once' },
    recurrenceDays: { type: DataTypes.JSONB, allowNull: true },
    recurrenceTime: { type: DataTypes.STRING(5), allowNull: true },
    recurrencePeriodStart: { type: DataTypes.DATEONLY, allowNull: true },
    recurrencePeriodEnd: { type: DataTypes.DATEONLY, allowNull: true },
    nextRunAt: { type: DataTypes.DATE, allowNull: true }
  }, {
    sequelize,
    modelName: 'NotificationCampaign',
    tableName: 'NotificationCampaigns',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return NotificationCampaign;
};
