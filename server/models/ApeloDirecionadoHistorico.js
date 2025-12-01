'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ApeloDirecionadoHistorico extends Model {
    static associate(models) {
      if (models.ApeloDirecionadoCelula) {
        ApeloDirecionadoHistorico.belongsTo(models.ApeloDirecionadoCelula, { foreignKey: 'apelo_id', as: 'apelo' });
      }
      if (models.Celula) {
        ApeloDirecionadoHistorico.belongsTo(models.Celula, { foreignKey: 'celula_id_origem', as: 'celulaOrigem' });
        ApeloDirecionadoHistorico.belongsTo(models.Celula, { foreignKey: 'celula_id_destino', as: 'celulaDestino' });
      }
    }
  }

  ApeloDirecionadoHistorico.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    apelo_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    celula_id_origem: {
      type: DataTypes.UUID,
      allowNull: true
    },
    celula_id_destino: {
      type: DataTypes.UUID,
      allowNull: true
    },
    tipo_evento: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'CELULA'
    },
    status_anterior: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status_novo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    data_movimento: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    motivo: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ApeloDirecionadoHistorico',
    tableName: 'apelos_direcionados_historico',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return ApeloDirecionadoHistorico;
};
