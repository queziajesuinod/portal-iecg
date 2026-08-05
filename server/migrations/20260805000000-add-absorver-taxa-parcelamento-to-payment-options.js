const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'PaymentOptions', schema },
      'absorverTaxaParcelamento',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Quando true, o evento NÃO repassa a taxa de parcelamento ao cliente (absorve). '
          + 'Quando false (padrão), repassa automaticamente a taxa da Cielo por bandeira.'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'PaymentOptions', schema },
      'absorverTaxaParcelamento'
    );
  }
};
