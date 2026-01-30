const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'Coupons', schema },
      'minimumQuantity',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Quantidade m?nima de ingressos para ativar o cupom'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ tableName: 'Coupons', schema }, 'minimumQuantity');
  }
};
