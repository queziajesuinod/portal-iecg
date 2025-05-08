'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'forms', schema: 'dev_iecg' },
      'allowMultiplePayments',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      { tableName: 'forms', schema: 'dev_iecg' },
      'allowMultiplePayments'
    );
  }
};
