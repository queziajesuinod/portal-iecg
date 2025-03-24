// Migration: migrations/YYYYMMDDHHMMSS-create-apelos-direcionados-celulas.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS dev_iecg;`);
    await queryInterface.createTable({
      tableName: 'apelos_direcionados_celulas',
      schema: 'dev_iecg'
    }, {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4
      },
      nome: Sequelize.STRING,
      decisao: Sequelize.STRING,
      whatsapp: Sequelize.STRING,
      rede: Sequelize.STRING,
      bairro_apelo: Sequelize.STRING,
      lider_direcionado: Sequelize.STRING,
      cel_lider: Sequelize.STRING,
      bairro_direcionado: Sequelize.STRING,
      data_direcionamento: Sequelize.DATEONLY,
      campus_iecg: Sequelize.STRING,
      status: Sequelize.STRING,
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable({
      tableName: 'apelos_direcionados_celulas',
      schema: 'dev_iecg'
    });
  }
};
