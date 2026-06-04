const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'FinancialFeeConfigs', schema },
      'vigenteDe',
      {
        type: Sequelize.DATEONLY,
        allowNull: true, // nullable para não quebrar registros existentes; backfill abaixo
      }
    );
    await queryInterface.addColumn(
      { tableName: 'FinancialFeeConfigs', schema },
      'vigenteAte',
      {
        type: Sequelize.DATEONLY,
        allowNull: true, // null = vigência aberta (config atual)
      }
    );
    // Backfill: config existente começa a vigorar desde o início dos tempos
    await queryInterface.sequelize.query(
      `UPDATE "${schema}"."FinancialFeeConfigs" SET "vigenteDe" = '2000-01-01' WHERE "vigenteDe" IS NULL`
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ tableName: 'FinancialFeeConfigs', schema }, 'vigenteDe');
    await queryInterface.removeColumn({ tableName: 'FinancialFeeConfigs', schema }, 'vigenteAte');
  },
};
