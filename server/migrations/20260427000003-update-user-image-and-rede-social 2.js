'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = { tableName: 'Users', schema };

    const columns = await queryInterface.describeTable(table);

    await queryInterface.changeColumn(table, 'image', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    if (!columns.rede_social) {
      await queryInterface.addColumn(table, 'rede_social', {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = { tableName: 'Users', schema };

    await queryInterface.changeColumn(table, 'image', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    const columns = await queryInterface.describeTable(table);
    if (columns.rede_social) {
      await queryInterface.removeColumn(table, 'rede_social');
    }
  }
};
