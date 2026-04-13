'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventRegistrationRule extends Model {
    static associate(models) {
      EventRegistrationRule.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventRegistrationRule.belongsTo(models.FormField, { foreignKey: 'formFieldId', as: 'formField' });
    }
  }

  EventRegistrationRule.init({
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
    formFieldId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'FormFields', key: 'id' },
      comment: 'Referência ao campo do formulário (opcional, para vínculo visual)'
    },
    fieldKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Chave do campo no JSON de dados (ex: estadoCivil, idade)'
    },
    operator: {
      type: DataTypes.ENUM(
        'eq', 'neq',
        'gt', 'gte', 'lt', 'lte',
        'in', 'not_in',
        'contains',
        'age_gte', 'age_lte', 'age_gt', 'age_lt'
      ),
      allowNull: false,
    },
    value: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Valor de comparação (string, número ou array)'
    },
    errorMessage: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    appliesTo: {
      type: DataTypes.ENUM('buyer', 'attendee'),
      allowNull: false,
      defaultValue: 'attendee',
    },
    ruleGroup: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Regras do mesmo grupo são AND; grupos diferentes são OR'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'EventRegistrationRule',
    tableName: 'EventRegistrationRules',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventRegistrationRule;
};
