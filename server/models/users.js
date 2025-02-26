'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Perfil, { foreignKey: 'perfilId' });
    }
  }

  User.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    perfilId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    passwordHash: DataTypes.STRING,
    image: DataTypes.STRING,
    salt: DataTypes.STRING,
    username: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users', // Nome correto da tabela no banco
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return User;
};
