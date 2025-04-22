'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Aposentado extends Model {
    static associate(models) {
      // Aqui você pode adicionar associações futuras, se necessário
    }
  }

  Aposentado.init({
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
    data_nascimento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    filhos: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    endereco: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    telefones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estado_civil: {
      type: DataTypes.ENUM('Solteiro', 'Casado', 'Viúvo', 'Divorciado'),
      allowNull: false
    },
    nome_esposo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profissao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rede_social: {
      type: DataTypes.STRING,
      allowNull: true
    },
    indicacao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    frequenta_celula: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    batizado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    encontro: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    escolas: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    patologia: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    plano_saude: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hospital: {
      type: DataTypes.STRING,
      allowNull: true
    },
    remedios: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    habilidades: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    analfabeto: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    foto: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cpf: {
      type: DataTypes.TEXT,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'Aposentado',
    tableName: 'aposentados_mia',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return Aposentado;
};
