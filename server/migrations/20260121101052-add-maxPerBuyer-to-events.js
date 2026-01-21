'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'Events', schema: process.env.DB_SCHEMA || 'dev_iecg' },
      'maxPerBuyer',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Quantidade máxima de inscrições por comprador'
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      { tableName: 'Events', schema: process.env.DB_SCHEMA || 'dev_iecg' },
      'maxPerBuyer'
    );
  }
};
