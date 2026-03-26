'use strict';

const uuid = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const journalsTable = { tableName: 'BoardJournals', schema };
    const usersTable = { tableName: 'Users', schema };
    const managersTable = { tableName: 'BoardJournalManagers', schema };

    await queryInterface.createTable(managersTable, {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      journalId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: journalsTable,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: usersTable,
          key: 'id'
        },
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
    });

    await queryInterface.addIndex(managersTable, ['journalId'], {
      name: 'idx_board_journal_managers_journal'
    });
    await queryInterface.addIndex(managersTable, ['userId'], {
      name: 'idx_board_journal_managers_user'
    });
    await queryInterface.addIndex(managersTable, ['journalId', 'userId'], {
      name: 'idx_board_journal_managers_unique',
      unique: true
    });

    const [rows] = await queryInterface.sequelize.query(`
      SELECT "id", "managerUserId"
      FROM "${schema}"."BoardJournals"
      WHERE "managerUserId" IS NOT NULL
    `);

    if (Array.isArray(rows) && rows.length > 0) {
      const now = new Date();
      await queryInterface.bulkInsert(managersTable, rows.map((row) => ({
        id: uuid.v4(),
        journalId: row.id,
        userId: row.managerUserId,
        createdAt: now,
        updatedAt: now
      })));
    }
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const managersTable = { tableName: 'BoardJournalManagers', schema };

    await queryInterface.removeIndex(managersTable, 'idx_board_journal_managers_unique').catch(() => null);
    await queryInterface.removeIndex(managersTable, 'idx_board_journal_managers_user').catch(() => null);
    await queryInterface.removeIndex(managersTable, 'idx_board_journal_managers_journal').catch(() => null);
    await queryInterface.dropTable(managersTable).catch(() => null);
  }
};
