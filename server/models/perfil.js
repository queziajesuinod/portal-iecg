'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Perfil extends Model {
    static associate(models) {
      // Define que um perfil tem muitos usuarios
      if (models.User) {
        Perfil.hasMany(models.User, { foreignKey: 'perfilId' });
        Perfil.belongsToMany(models.User, {
          through: models.UserPerfil,
          as: 'usuarios',
          foreignKey: 'perfilId',
          otherKey: 'userId'
        });
      }
      if (models.Permissao) {
        Perfil.belongsToMany(models.Permissao, {
          through: models.PerfilPermissao,
          foreignKey: 'perfilId',
          otherKey: 'permissaoId',
          as: 'permissoes',
        });
      }
    }
  }

  Perfil.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      descricao: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Perfil',
      tableName: 'Perfis',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return Perfil;
};
