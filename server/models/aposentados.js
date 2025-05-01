'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Aposentado extends Model {
    static associate(models) {
      Aposentado.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  Aposentado.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    filhos: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    indicacao: {
      type: DataTypes.STRING,
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
    tipo_pessoa: {
      type: DataTypes.ENUM('Coordenadora','Coordenador', 'Líder', 'Pastor','Pastora', 'Apoio', 'Idoso'),
      allowNull: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
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
    modelName: 'Aposentado',
    tableName: 'aposentados_mia',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return Aposentado;
};
