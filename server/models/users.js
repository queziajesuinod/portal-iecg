'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
    User.belongsTo(models.Perfil, { foreignKey: 'perfilId' });
    User.belongsToMany(models.Perfil, {
      through: models.UserPerfil,
      as: 'perfis',
      foreignKey: 'userId',
      otherKey: 'perfilId'
    });
    User.hasOne(models.Aposentado, { foreignKey: 'user_id', as: 'aposentado' });
    User.belongsTo(models.User, { as: 'conjuge', foreignKey: 'conjuge_id' });
    User.hasMany(models.User, { as: 'conjugeDe', foreignKey: 'conjuge_id' });
    User.hasMany(models.Celula, { as: 'lideranca', foreignKey: 'liderId' });
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
    salt: DataTypes.STRING,
    image: DataTypes.STRING,
    username: DataTypes.STRING,
  
    // 🔽 Adicione aqui os novos campos vindos do Aposentado:
    data_nascimento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    endereco: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    bairro: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cep: {
      type: DataTypes.STRING,
      allowNull: true
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: true
    },
    telefone: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estado_civil: {
      type: DataTypes.ENUM('Solteiro', 'Casado', 'Viúvo', 'Divorciado'),
      allowNull: true
    },
    nome_esposo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profissao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    frequenta_celula: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    batizado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    encontro: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    escolas: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cpf: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_lider_celula: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    conjuge_id: {
      type: DataTypes.UUID,
      allowNull: true
    }

  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });
  
  return User;
};
