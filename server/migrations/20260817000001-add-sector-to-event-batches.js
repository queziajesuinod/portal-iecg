const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'EventBatches', schema },
      'sector',
      {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Setor do lote (ex: FRENTE, INTERMEDIARIO, GALERIA). Rotulo livre por evento; null = evento sem setores'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ tableName: 'EventBatches', schema }, 'sector');
  }
};
