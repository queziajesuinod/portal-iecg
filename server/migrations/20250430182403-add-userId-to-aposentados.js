'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema: 'dev_iecg' },
      'userId',
      {
        type: Sequelize.UUID,
        allowNull: true, // permite nulo durante a migração
        references: {
          model: {
            tableName: 'Users',
            schema: 'dev_iecg'
          },
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      { tableName: 'aposentados_mia', schema: 'dev_iecg' },
      'userId'
    );
  }
};
