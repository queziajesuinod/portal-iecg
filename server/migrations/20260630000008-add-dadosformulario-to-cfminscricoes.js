module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.addColumn(
      { schema, tableName: 'CfmInscricoes' },
      'dadosFormulario',
      { type: Sequelize.JSONB, allowNull: true }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeColumn({ schema, tableName: 'CfmInscricoes' }, 'dadosFormulario');
  },
};
