'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Ministro extends Model {
    static associate(models) {
      if (models.RegistroCulto) {
        Ministro.belongsToMany(models.RegistroCulto, {
          through: 'registro_culto_ministro',
          foreignKey: 'ministroId',
          otherKey: 'registroCultoId',
          as: 'registros',
        });
      }
    }
  }

  Ministro.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      nome: {
        type: DataTypes.STRING(150),
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
      modelName: 'Ministro',
      tableName: 'ministro',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return Ministro;
};
