'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Primeiro, garante que o schema existe
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS dev_iecg;`);

    // Depois, cria a tabela dentro do schema
    await queryInterface.createTable(
      {
        tableName: 'celulas',
        schema: 'dev_iecg'
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false
        },
        celula: Sequelize.STRING,
        rede: Sequelize.STRING,
        lider: Sequelize.STRING,
        email_lider: Sequelize.STRING,
        cel_lider: Sequelize.STRING,
        anfitriao: Sequelize.STRING,
        campus: Sequelize.STRING,
        endereco: Sequelize.STRING,
        bairro: Sequelize.STRING,
        cidade: Sequelize.STRING,
        estado: Sequelize.STRING,
        lideranca: Sequelize.STRING,
        pastor_geracao: Sequelize.STRING,
        pastor_campus: Sequelize.STRING,
        dia: Sequelize.STRING,
        lat: Sequelize.FLOAT,
        lon: Sequelize.FLOAT
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable({ tableName: 'celulas', schema: 'dev_iecg' });
  }
};
