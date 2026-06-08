const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NotificationTemplate extends Model {
    static associate(models) {
      NotificationTemplate.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      NotificationTemplate.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
      NotificationTemplate.hasMany(models.NotificationCampaign, { foreignKey: 'templateId', as: 'campaigns' });
    }
  }

  NotificationTemplate.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(200), allowNull: false },
    channel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'whatsapp' },
    body: { type: DataTypes.TEXT, allowNull: false },
    variables: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    context: { type: DataTypes.STRING(50), allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true }
  }, {
    sequelize,
    modelName: 'NotificationTemplate',
    tableName: 'NotificationTemplates',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return NotificationTemplate;
};
