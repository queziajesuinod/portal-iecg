const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class UserPerfil extends Model {
    static associate(models) {
      // associations defined in User and Perfil for belongsToMany
    }
  }

  UserPerfil.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      perfilId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Perfis',
          key: 'id'
        }
      }
    },
    {
      sequelize,
      modelName: 'UserPerfil',
      tableName: 'UserPerfis',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'perfilId']
        }
      ]
    }
  );

  return UserPerfil;
};
