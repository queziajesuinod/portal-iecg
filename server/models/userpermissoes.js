'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class UserPermissao extends Model {}

  UserPermissao.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      permissaoId: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'UserPermissao',
      tableName: 'UserPermissoes',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'permissaoId']
        }
      ]
    }
  );

  return UserPermissao;
};
