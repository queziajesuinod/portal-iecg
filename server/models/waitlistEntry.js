const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class WaitlistEntry extends Model {
    static associate(models) {
      WaitlistEntry.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      WaitlistEntry.belongsTo(models.EventBatch, { foreignKey: 'batchId', as: 'batch' });
      WaitlistEntry.belongsTo(models.Registration, { foreignKey: 'registrationId', as: 'registration' });
    }
  }

  WaitlistEntry.init({
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
    batchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'EventBatches', key: 'id' },
      comment: 'Lote/setor desejado. A fila e por lote.'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    contactName: { type: DataTypes.STRING, allowNull: true },
    contactEmail: { type: DataTypes.STRING, allowNull: true },
    contactWhatsapp: { type: DataTypes.STRING, allowNull: true },
    contactCpf: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Somente digitos; impede 2 entradas da mesma pessoa no mesmo lote'
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Dados completos da inscricao SEM pagamento'
    },
    status: {
      type: DataTypes.ENUM('waiting', 'offered', 'fulfilled', 'expired', 'cancelled'),
      allowNull: false,
      defaultValue: 'waiting',
    },
    offerToken: { type: DataTypes.STRING, allowNull: true },
    offeredAt: { type: DataTypes.DATE, allowNull: true },
    offerExpiresAt: { type: DataTypes.DATE, allowNull: true },
    registrationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Registrations', key: 'id' },
      comment: 'Inscricao pending materializada na oferta'
    },
    notifiedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastNotifiedChannels: { type: DataTypes.JSONB, allowNull: true },
    lastError: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'WaitlistEntry',
    tableName: 'WaitlistEntries',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return WaitlistEntry;
};
