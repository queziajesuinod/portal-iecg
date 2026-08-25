const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventCoordinator extends Model {
    static associate(models) {
      EventCoordinator.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      if (models.Member) {
        EventCoordinator.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      }
      if (models.User) {
        EventCoordinator.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      }
      EventCoordinator.hasMany(models.EventCoordinatorLog, { foreignKey: 'coordinatorId', as: 'logs' });
    }
  }

  EventCoordinator.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Events', key: 'id' }
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Members', key: 'id' },
      comment: 'Membro vinculado como coordenador (opcional)'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nome (override quando nao ha membro vinculado)'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'E-mail de contato (override do membro)'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'WhatsApp de contato (override do membro)'
    },
    channels: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { email: true, whatsapp: false },
    },
    content: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        newRegistrants: true, fullList: true, partialPayments: true, netValue: true
      },
    },
    listFields: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Colunas selecionadas (ordenadas) das listas; vazio = padrao'
    },
    intervalDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    sendHour: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8,
    },
    windowSource: {
      type: DataTypes.ENUM('BATCH_PERIOD', 'CUSTOM'),
      allowNull: false,
      defaultValue: 'BATCH_PERIOD',
    },
    windowStart: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    windowEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },
  }, {
    sequelize,
    modelName: 'EventCoordinator',
    tableName: 'EventCoordinators',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventCoordinator;
};
