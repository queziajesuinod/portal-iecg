'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.addColumn(
      { tableName: 'FinancialExpenses', schema },
      'receiptUrl',
      {
        type: Sequelize.STRING(500),
        allowNull: true,
        defaultValue: null
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeColumn(
      { tableName: 'FinancialExpenses', schema },
      'receiptUrl'
    );
  }
};
