const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RegistrationTermAcceptance extends Model {
    static associate(models) {
      RegistrationTermAcceptance.belongsTo(models.Registration, { foreignKey: 'registrationId', as: 'registration' });
      if (models.RegistrationAttendee) {
        RegistrationTermAcceptance.belongsTo(models.RegistrationAttendee, { foreignKey: 'registrationAttendeeId', as: 'attendee' });
      }
      RegistrationTermAcceptance.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      if (models.EventLiabilityTerm) {
        RegistrationTermAcceptance.belongsTo(models.EventLiabilityTerm, { foreignKey: 'eventLiabilityTermId', as: 'term' });
      }
    }
  }

  RegistrationTermAcceptance.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    registrationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Registrations', key: 'id' }
    },
    registrationAttendeeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'RegistrationAttendees', key: 'id' },
      comment: 'Participante (menor) coberto por este termo'
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Events', key: 'id' }
    },
    eventLiabilityTermId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'EventLiabilityTerms', key: 'id' }
    },
    termVersion: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    signerName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nome do responsavel que assinou'
    },
    signerDocument: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'CPF/documento do responsavel'
    },
    participantName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Snapshot do nome do participante coberto'
    },
    emergencyContactName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nome do contato de emergencia'
    },
    emergencyContactPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'WhatsApp do contato de emergencia'
    },
    signatureImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Assinatura a mao (data-URL PNG base64), quando signatureMode=DRAW'
    },
    termSnapshotHtml: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'HTML do termo (placeholders preenchidos) exibido no aceite'
    },
    contentHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'SHA-256 do termSnapshotHtml'
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'RegistrationTermAcceptance',
    tableName: 'RegistrationTermAcceptances',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return RegistrationTermAcceptance;
};
