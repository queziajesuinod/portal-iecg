const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventNotification extends Model {
    static associate(models) {
      EventNotification.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventNotification.belongsTo(models.Registration, { foreignKey: 'registrationId', as: 'registration' });
      EventNotification.belongsTo(models.EventNotificationTemplate, { foreignKey: 'templateId', as: 'template' });
      EventNotification.belongsTo(models.EventNotificationGroup, { foreignKey: 'groupId', as: 'group' });
      EventNotification.belongsTo(models.User, { foreignKey: 'sentBy', as: 'sender' });
    }
  }

  EventNotification.init({
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
    registrationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Registrations',
        key: 'id'
      }
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'EventNotificationTemplates',
        key: 'id'
      }
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'EventNotificationGroups',
        key: 'id'
      },
      comment: 'Grupo de notificação (se enviado em campanha)'
    },
    channel: {
      type: DataTypes.ENUM('whatsapp', 'sms', 'email'),
      allowNull: false,
      comment: 'Canal de envio'
    },
    recipient: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Destinatário (telefone ou email)'
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Mensagem enviada (com variáveis já substituídas)'
    },
    mediaUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    externalId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID externo da Evolution API ou outro provedor'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensagem de erro (se falhou)'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data/hora de envio'
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data/hora de entrega'
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data/hora de leitura'
    },
    sentBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuário que enviou (null = automático)'
    },
  }, {
    sequelize,
    modelName: 'EventNotification',
    tableName: 'EventNotifications',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventNotification;
};
