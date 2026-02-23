const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'RegistrationPayments', schema },
      'cardBrand',
      {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: 'Bandeira do cartão quando method=credit_card'
      }
    );

    await queryInterface.addIndex(
      { tableName: 'RegistrationPayments', schema },
      ['cardBrand']
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'RegistrationPayments', schema },
      'cardBrand'
    );
  }
};
