'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.changeColumn(
      { tableName: 'Members', schema },
      'photoUrl',
      {
        type: Sequelize.TEXT,
        allowNull: true
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.changeColumn(
      { tableName: 'Members', schema },
      'photoUrl',
      {
        type: Sequelize.STRING(500),
        allowNull: true
      }
    );
  }
};
