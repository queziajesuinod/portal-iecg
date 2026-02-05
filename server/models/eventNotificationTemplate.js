const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventNotificationTemplate extends Model {
    static associate(models) {
      EventNotificationTemplate.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventNotificationTemplate.hasMany(models.EventNotification, { foreignKey: 'templateId', as: 'notifications' });
    }
  }

  EventNotificationTemplate.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Events',
        key: 'id'
      },
      comment: 'Evento específico (null = template global)'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nome do template'
    },
    type: {
      type: DataTypes.ENUM('confirmation', 'reminder', 'checkin', 'custom'),
      allowNull: false,
      comment: 'Tipo de notificação'
    },
    channel: {
      type: DataTypes.ENUM('whatsapp', 'sms', 'email'),
      allowNull: false,
      defaultValue: 'whatsapp',
      comment: 'Canal de envio'
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Assunto (para email)'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Corpo da mensagem com variáveis {{nome}}, {{evento}}, etc'
    },
    mediaUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL de mídia anexa (imagem, PDF, etc)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'EventNotificationTemplate',
    tableName: 'EventNotificationTemplates',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventNotificationTemplate;
};
