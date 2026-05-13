const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NotificationSequence extends Model {
    static associate(models) {
      NotificationSequence.hasMany(models.NotificationSequenceStep, { foreignKey: 'sequenceId', as: 'steps' });
      NotificationSequence.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    }
  }

  NotificationSequence.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    channel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'whatsapp' },
    audienceType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'filter' },
    audienceConfig: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    evolutionInstance: { type: DataTypes.STRING(100), allowNull: true },
    sendDelayMs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    createdBy: { type: DataTypes.UUID, allowNull: true }
  }, {
    sequelize,
    modelName: 'NotificationSequence',
    tableName: 'NotificationSequences',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return NotificationSequence;
};
