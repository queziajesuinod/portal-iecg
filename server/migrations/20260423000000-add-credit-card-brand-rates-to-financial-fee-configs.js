const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'FinancialFeeConfigs', schema },
      'creditCardBrandRates',
      {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'FinancialFeeConfigs', schema },
      'creditCardBrandRates'
    );
  }
};
