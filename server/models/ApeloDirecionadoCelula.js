'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ApeloDirecionadoCelula extends Model {
    static associate(models) {
      if (models.Celula) {
        ApeloDirecionadoCelula.belongsTo(models.Celula, { foreignKey: 'celula_id', as: 'celulaAtual' });
      }
      if (models.ApeloDirecionadoHistorico) {
        ApeloDirecionadoCelula.hasMany(models.ApeloDirecionadoHistorico, { foreignKey: 'apelo_id', as: 'historicos' });
      }
    }
  }

  ApeloDirecionadoCelula.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    decisao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    whatsapp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rede: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bairro_apelo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cidade_apelo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estado_apelo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    direcionado_celula: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    idade: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    bairro_proximo: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    lider_direcionado: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cel_lider: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bairro_direcionado: {
      type: DataTypes.STRING,
      allowNull: true
    },
    data_direcionamento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    campus_iecg: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    celula_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    data_direcionamento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ApeloDirecionadoCelula',
    tableName: 'apelos_direcionados_celulas',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return ApeloDirecionadoCelula;
};
