'use strict';

const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'PaymentOptions', schema },
      'installmentInterestRates',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      { tableName: 'PaymentOptions', schema },
      'installmentInterestRates'
    );
  }
};
