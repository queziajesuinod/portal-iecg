const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventNotificationGroup extends Model {
    static associate(models) {
      EventNotificationGroup.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventNotificationGroup.hasMany(models.EventNotificationGroupMember, { foreignKey: 'groupId', as: 'members' });
      EventNotificationGroup.hasMany(models.EventNotification, { foreignKey: 'groupId', as: 'notifications' });
    }
  }

  EventNotificationGroup.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nome do grupo (ex: Inscritos Lote 1)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição do grupo'
    },
    filterCriteria: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Critérios de filtro para segmentação automática'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'EventNotificationGroup',
    tableName: 'EventNotificationGroups',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventNotificationGroup;
};
