'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class EventBatch extends Model {
    static associate(models) {
      EventBatch.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      EventBatch.hasMany(models.Registration, { foreignKey: 'batchId', as: 'registrations' });
    }
  }

  EventBatch.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Ex: Lote 1 - Early Bird, Lote 2 - Regular'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    maxQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = unlimited
    },
    currentQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data de início da venda deste lote'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data de fim da venda deste lote'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Ordem de exibição dos lotes'
    },
  }, {
    sequelize,
    modelName: 'EventBatch',
    tableName: 'EventBatches',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return EventBatch;
};
