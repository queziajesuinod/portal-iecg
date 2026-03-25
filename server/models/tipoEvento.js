'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TipoEvento extends Model {
    static associate(models) {
      if (models.RegistroCulto) {
        TipoEvento.hasMany(models.RegistroCulto, { foreignKey: 'tipoEventoId', as: 'registros' });
      }
    }
  }

  TipoEvento.init(
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
    },
    {
      sequelize,
      modelName: 'TipoEvento',
      tableName: 'tipo_evento',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return TipoEvento;
};
