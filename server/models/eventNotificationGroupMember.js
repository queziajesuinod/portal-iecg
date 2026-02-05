const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventNotificationGroupMember extends Model {
    static associate(models) {
      EventNotificationGroupMember.belongsTo(models.EventNotificationGroup, { foreignKey: 'groupId', as: 'group' });
      EventNotificationGroupMember.belongsTo(models.Registration, { foreignKey: 'registrationId', as: 'registration' });
      EventNotificationGroupMember.belongsTo(models.RegistrationAttendee, { foreignKey: 'attendeeId', as: 'attendee' });
      EventNotificationGroupMember.belongsTo(models.User, { foreignKey: 'addedBy', as: 'addedByUser' });
    }
  }

  EventNotificationGroupMember.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'EventNotificationGroups',
        key: 'id'
      }
    },
    registrationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Registrations',
        key: 'id'
      }
    },
    attendeeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'RegistrationAttendees',
        key: 'id'
      },
      comment: 'ID do inscrito específico (opcional)'
    },
    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    addedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuário que adicionou (null = automático)'
    },
  }, {
    sequelize,
    modelName: 'EventNotificationGroupMember',
    tableName: 'EventNotificationGroupMembers',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventNotificationGroupMember;
};
