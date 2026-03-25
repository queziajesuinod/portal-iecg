'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Ministerio extends Model {
    static associate(models) {
      if (models.CampusMinisterio) {
        Ministerio.hasMany(models.CampusMinisterio, { foreignKey: 'ministerioId', as: 'campusVinculos' });
      }
      if (models.RegistroCulto) {
        Ministerio.hasMany(models.RegistroCulto, { foreignKey: 'ministerioId', as: 'registros' });
      }
    }
  }

  Ministerio.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      nome: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      exibeCriancas: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      exibeBebes: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      apeloDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      exibeOnline: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Ministerio',
      tableName: 'ministerio',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return Ministerio;
};
