'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const journalsTable = { tableName: 'BoardJournals', schema };

    await queryInterface.addColumn(journalsTable, 'managerUserId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: { tableName: 'Users', schema },
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex(journalsTable, ['managerUserId'], {
      name: 'idx_board_journals_manager_user'
    });
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const journalsTable = { tableName: 'BoardJournals', schema };

    await queryInterface.removeIndex(journalsTable, 'idx_board_journals_manager_user').catch(() => null);
    await queryInterface.removeColumn(journalsTable, 'managerUserId').catch(() => null);
  }
};
