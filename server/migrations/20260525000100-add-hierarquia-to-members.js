module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.addColumn(
      { tableName: 'Members', schema },
      'pastorGeracaoMemberId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'Members', schema },
      'pastorCampusMemberId',
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
      ['pastorGeracaoMemberId'],
      { name: 'idx_members_pastor_geracao' }
    );
    await queryInterface.addIndex(
      { tableName: 'Members', schema },
      ['pastorCampusMemberId'],
      { name: 'idx_members_pastor_campus' }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeIndex({ tableName: 'Members', schema }, 'idx_members_pastor_geracao');
    await queryInterface.removeIndex({ tableName: 'Members', schema }, 'idx_members_pastor_campus');
    await queryInterface.removeColumn({ tableName: 'Members', schema }, 'pastorGeracaoMemberId');
    await queryInterface.removeColumn({ tableName: 'Members', schema }, 'pastorCampusMemberId');
  }
};
