'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Permissao extends Model {
    static associate(models) {
      if (models.Perfil) {
        Permissao.belongsToMany(models.Perfil, {
          through: models.PerfilPermissao,
          foreignKey: 'permissaoId',
          otherKey: 'perfilId',
          as: 'perfis',
        });
      }
    }
  }

  Permissao.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      nome: DataTypes.STRING,
      descricao: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Permissao',
      tableName: 'Permissoes',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return Permissao;
};
