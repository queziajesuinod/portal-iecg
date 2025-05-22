'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Celula extends Model {
    static associate(models) {
      // Associações futuras aqui, se necessário
    }
  }

  Celula.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    celula: {
      type: DataTypes.STRING,
      allowNull: false
    },
    rede: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lider: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email_lider: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cel_lider: {
      type: DataTypes.STRING,
      allowNull: true
    },
    anfitriao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    campus: {
      type: DataTypes.STRING,
      allowNull: true
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bairro: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cidade: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lideranca: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pastor_geracao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pastor_campus: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dia: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lat: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    lon: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Celula',
    tableName: 'celulas',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return Celula;
};
