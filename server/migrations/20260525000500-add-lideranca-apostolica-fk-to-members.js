module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.addColumn(
      { tableName: 'Members', schema },
      'liderancaApostolicaMemberId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    );

    await queryInterface.addIndex(
      { tableName: 'Members', schema },
      ['liderancaApostolicaMemberId'],
      { name: 'idx_members_lideranca_apostolica' }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeIndex({ tableName: 'Members', schema }, 'idx_members_lideranca_apostolica');
    await queryInterface.removeColumn({ tableName: 'Members', schema }, 'liderancaApostolicaMemberId');
  }
};
