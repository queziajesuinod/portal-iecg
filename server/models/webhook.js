'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Webhook extends Model {
    static associate() {
      // No associations
    }
  }

  Webhook.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      events: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      secret: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Webhook',
      tableName: 'webhooks',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return Webhook;
};
