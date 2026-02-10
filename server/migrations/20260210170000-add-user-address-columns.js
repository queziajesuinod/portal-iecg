'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = { schema: SCHEMA, tableName: 'Users' };
    await queryInterface.addColumn(table, 'bairro', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn(table, 'cep', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn(table, 'numero', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    const table = { schema: SCHEMA, tableName: 'Users' };
    await queryInterface.removeColumn(table, 'numero');
    await queryInterface.removeColumn(table, 'cep');
    await queryInterface.removeColumn(table, 'bairro');
  }
};
