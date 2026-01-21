'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Event extends Model {
    static associate(models) {
      Event.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      Event.hasMany(models.EventBatch, { foreignKey: 'eventId', as: 'batches' });
      Event.hasMany(models.FormField, { foreignKey: 'eventId', as: 'formFields' });
      Event.hasMany(models.Registration, { foreignKey: 'eventId', as: 'registrations' });
    }
  }

  Event.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    maxRegistrations: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = unlimited
    },
    currentRegistrations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
  }, {
    sequelize,
    modelName: 'Event',
    tableName: 'Events',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return Event;
};
