'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Campus extends Model {
    static associate(models) {
      if (models.Celula) {
        Campus.hasMany(models.Celula, { foreignKey: 'campusId', as: 'celulas' });
      }
      if (models.CampusMinisterio) {
        Campus.hasMany(models.CampusMinisterio, { foreignKey: 'campusId', as: 'ministerioVinculos' });
      }
      if (models.RegistroCulto) {
        Campus.hasMany(models.RegistroCulto, { foreignKey: 'campusId', as: 'registrosCulto' });
      }
    }
  }

  Campus.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      endereco: DataTypes.TEXT,
      bairro: DataTypes.STRING,
      cidade: DataTypes.STRING,
      estado: DataTypes.STRING,
      pastoresResponsaveis: DataTypes.TEXT,
      lat: DataTypes.STRING,
      lon: DataTypes.STRING,
      transmiteOnline: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Campus',
      tableName: 'Campus',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return Campus;
};
