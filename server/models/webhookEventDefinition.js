'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class WebhookEventDefinition extends Model {}

  WebhookEventDefinition.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
      },
      eventKey: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      tableName: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      fieldName: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      changeType: {
        type: DataTypes.ENUM('INSERT', 'UPDATE', 'DELETE'),
        allowNull: false,
        defaultValue: 'UPDATE'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'WebhookEventDefinition',
      tableName: 'webhook_event_definitions',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
      timestamps: true
    }
  );

  return WebhookEventDefinition;
};
