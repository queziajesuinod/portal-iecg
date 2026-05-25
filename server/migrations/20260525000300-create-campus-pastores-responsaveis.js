module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.createTable('CampusPastoresResponsaveis', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      campusId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'Campus', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      memberId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { schema });

    await queryInterface.addIndex(
      { tableName: 'CampusPastoresResponsaveis', schema },
      ['campusId', 'memberId'],
      { name: 'idx_campus_pastor_responsavel_unique', unique: true }
    );
    await queryInterface.addIndex(
      { tableName: 'CampusPastoresResponsaveis', schema },
      ['memberId'],
      { name: 'idx_campus_pastor_responsavel_member' }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'CampusPastoresResponsaveis', schema });
  }
};
