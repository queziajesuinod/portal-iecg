'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ApeloDirecionadoCelula extends Model {
    static associate(models) {
      // Associações futuras
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