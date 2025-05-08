'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createSchema('dev_iecg');
    await queryInterface.createTable(
      { tableName: 'form_types', schema: 'dev_iecg' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false
        },
        name: { type: Sequelize.STRING, allowNull: false },
        description: Sequelize.TEXT,
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE
      }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'form_types', schema: 'dev_iecg' });
  }
};