'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';
const HOUSING_TABLE = { schema: SCHEMA, tableName: 'EventHousingAllocations' };
const TEAMS_TABLE = { schema: SCHEMA, tableName: 'EventTeamsAllocations' };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(HOUSING_TABLE, 'idade', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
    await queryInterface.addColumn(HOUSING_TABLE, 'lider_de_celula', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn(TEAMS_TABLE, 'idade', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
    await queryInterface.addColumn(TEAMS_TABLE, 'lider_de_celula', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(HOUSING_TABLE, 'lider_de_celula');
    await queryInterface.removeColumn(HOUSING_TABLE, 'idade');
    await queryInterface.removeColumn(TEAMS_TABLE, 'lider_de_celula');
    await queryInterface.removeColumn(TEAMS_TABLE, 'idade');
  }
};
