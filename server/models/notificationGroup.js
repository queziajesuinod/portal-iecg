const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NotificationGroup extends Model {
    static associate(models) {
      NotificationGroup.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    }
  }

  NotificationGroup.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    sources: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    deduplicateBy: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'phone' },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    previewCount: { type: DataTypes.INTEGER, allowNull: true },
    previewUpdatedAt: { type: DataTypes.DATE, allowNull: true }
  }, {
    sequelize,
    modelName: 'NotificationGroup',
    tableName: 'NotificationGroups',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return NotificationGroup;
};
