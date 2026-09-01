const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventLiabilityTerm extends Model {
    static associate(models) {
      EventLiabilityTerm.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      if (models.User) {
        EventLiabilityTerm.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      }
      if (models.RegistrationTermAcceptance) {
        EventLiabilityTerm.hasMany(models.RegistrationTermAcceptance, { foreignKey: 'eventLiabilityTermId', as: 'acceptances' });
      }
    }
  }

  EventLiabilityTerm.init({
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
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Titulo exibido no topo do termo'
    },
    contentHtml: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
      comment: 'Corpo do termo em HTML, com placeholders {{CHAVE}}'
    },
    backgroundImageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Imagem de fundo/marca dagua (data-URL base64). Texto renderizado sobre ela.'
    },
    contentTopOffset: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Percentual (0-100) onde o cabecalho da imagem termina e o texto comeca'
    },
    contentBottomOffset: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Percentual (0-100) reservado no rodape (opcional)'
    },
    signatureMode: {
      type: DataTypes.ENUM('DRAW', 'CHECKBOX', 'TYPED'),
      allowNull: false,
      defaultValue: 'DRAW',
    },
    requireDocument: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    participantNameField: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'fieldName (attendee) do nome do participante'
    },
    signerNameField: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'fieldName (attendee) do nome do responsavel'
    },
    signerDocumentField: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'fieldName (attendee) do CPF do responsavel'
    },
    collectFields: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Campos padrao a coletar na assinatura quando ausentes no inscrito'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },
  }, {
    sequelize,
    modelName: 'EventLiabilityTerm',
    tableName: 'EventLiabilityTerms',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventLiabilityTerm;
};
