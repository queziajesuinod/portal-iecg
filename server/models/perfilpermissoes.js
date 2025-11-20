'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PerfilPermissao extends Model {}

  PerfilPermissao.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      perfilId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      permissaoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'PerfilPermissao',
      tableName: 'PerfilPermissoes',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
      timestamps: true,
    }
  );

  return PerfilPermissao;
};
