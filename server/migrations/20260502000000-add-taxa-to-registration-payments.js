const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'RegistrationPayments', schema },
      'taxa',
      {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Taxa/juros de cartão de crédito (separada do valor base)'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'RegistrationPayments', schema },
      'taxa'
    );
  }
};
