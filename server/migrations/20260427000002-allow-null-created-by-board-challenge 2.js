'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = { tableName: 'BoardChallenges', schema };

    const columns = await queryInterface.describeTable(table);

    if (!columns.createdByEmail) {
      await queryInterface.addColumn(table, 'createdByEmail', {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      });
    }

    await queryInterface.changeColumn(table, 'createdBy', {
      type: Sequelize.UUID,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = { tableName: 'BoardChallenges', schema };

    await queryInterface.changeColumn(table, 'createdBy', {
      type: Sequelize.UUID,
      allowNull: false
    });

    const columns = await queryInterface.describeTable(table);
    if (columns.createdByEmail) {
      await queryInterface.removeColumn(table, 'createdByEmail');
    }
  }
};
