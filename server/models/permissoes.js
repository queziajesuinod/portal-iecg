'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Permissao extends Model {
    static associate(models) {
      // Defina as associações aqui, se necessário.
    }
  }

  Permissao.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    nome: DataTypes.STRING,
    descricao: DataTypes.STRING
  }, {
    sequelize, // Usa a instância passada como parâmetro
    modelName: 'Permissao',
    tableName: 'Permissoes',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  return Permissao;
};
