const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NotificationCampaignRecipient extends Model {
    static associate(models) {
      NotificationCampaignRecipient.belongsTo(models.NotificationCampaign, { foreignKey: 'campaignId', as: 'campaign' });
    }
  }

  NotificationCampaignRecipient.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    campaignId: { type: DataTypes.UUID, allowNull: false },
    sourceType: { type: DataTypes.STRING(30), allowNull: false },
    sourceId: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING(200), allowNull: true },
    contact: { type: DataTypes.STRING(200), allowNull: false },
    resolvedMessage: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    readAt: { type: DataTypes.DATE, allowNull: true },
    errorMessage: { type: DataTypes.TEXT, allowNull: true },
    providerResponse: { type: DataTypes.JSONB, allowNull: true }
  }, {
    sequelize,
    modelName: 'NotificationCampaignRecipient',
    tableName: 'NotificationCampaignRecipients',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return NotificationCampaignRecipient;
};
