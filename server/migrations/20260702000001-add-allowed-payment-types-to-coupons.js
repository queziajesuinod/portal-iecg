module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.addColumn(
      { tableName: 'Coupons', schema },
      'allowedPaymentTypes',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeColumn({ tableName: 'Coupons', schema }, 'allowedPaymentTypes');
  },
};
