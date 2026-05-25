module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.addColumn(
      { tableName: 'celulas', schema },
      'liderancaMemberId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'celulas', schema },
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
      { tableName: 'celulas', schema },
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
      { tableName: 'celulas', schema },
      ['liderancaMemberId'],
      { name: 'idx_celulas_lideranca_member' }
    );
    await queryInterface.addIndex(
      { tableName: 'celulas', schema },
      ['pastorGeracaoMemberId'],
      { name: 'idx_celulas_pastor_geracao_member' }
    );
    await queryInterface.addIndex(
      { tableName: 'celulas', schema },
      ['pastorCampusMemberId'],
      { name: 'idx_celulas_pastor_campus_member' }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeIndex({ tableName: 'celulas', schema }, 'idx_celulas_lideranca_member');
    await queryInterface.removeIndex({ tableName: 'celulas', schema }, 'idx_celulas_pastor_geracao_member');
    await queryInterface.removeIndex({ tableName: 'celulas', schema }, 'idx_celulas_pastor_campus_member');
    await queryInterface.removeColumn({ tableName: 'celulas', schema }, 'liderancaMemberId');
    await queryInterface.removeColumn({ tableName: 'celulas', schema }, 'pastorGeracaoMemberId');
    await queryInterface.removeColumn({ tableName: 'celulas', schema }, 'pastorCampusMemberId');
  }
};
