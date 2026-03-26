'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';
const TABLE = { tableName: 'FinancialExpenses', schema: SCHEMA };

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable(TABLE);
    if (!tableDesc.supplier) {
      await queryInterface.addColumn(TABLE, 'supplier', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(TABLE, 'supplier');
  }
};
