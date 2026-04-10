'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class AreaVoluntariado extends Model {
    static associate(models) {
      if (models.Voluntariado) {
        AreaVoluntariado.hasMany(models.Voluntariado, {
          foreignKey: 'areaVoluntariadoId',
          as: 'voluntariados'
        });
      }
    }
  }

  AreaVoluntariado.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
      },
      nome: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'AreaVoluntariado',
      tableName: 'area_voluntariado',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return AreaVoluntariado;
};
