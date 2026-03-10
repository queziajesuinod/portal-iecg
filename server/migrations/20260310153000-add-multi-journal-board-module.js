'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const journalsTable = { tableName: 'BoardJournals', schema };
    const membersTable = { tableName: 'BoardJournalMembers', schema };
    const usersTable = { tableName: 'Users', schema };
    const categoriesTable = { tableName: 'BoardChallengeCategories', schema };
    const challengesTable = { tableName: 'BoardChallenges', schema };
    const badgesTable = { tableName: 'BoardBadges', schema };
    const userBadgesTable = { tableName: 'BoardUserBadges', schema };
    const submissionsTable = { tableName: 'BoardChallengeSubmissions', schema };

    await queryInterface.createTable(journalsTable, {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      coverImageUrl: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: usersTable,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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

    await queryInterface.addColumn(categoriesTable, 'journalId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: journalsTable,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn(challengesTable, 'journalId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: journalsTable,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn(badgesTable, 'journalId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: journalsTable,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn(userBadgesTable, 'journalId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: journalsTable,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn(submissionsTable, 'journalId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: journalsTable,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.createTable(membersTable, {
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
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      requestedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: usersTable,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex(journalsTable, ['name'], { name: 'idx_board_journals_name' });
    await queryInterface.addIndex(membersTable, ['journalId', 'userId'], { name: 'idx_board_journal_members_unique', unique: true });
    await queryInterface.addIndex(membersTable, ['journalId', 'status'], { name: 'idx_board_journal_members_status' });
    await queryInterface.addIndex(categoriesTable, ['journalId'], { name: 'idx_board_categories_journal' });
    await queryInterface.addIndex(challengesTable, ['journalId'], { name: 'idx_board_challenges_journal' });
    await queryInterface.addIndex(badgesTable, ['journalId'], { name: 'idx_board_badges_journal' });
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."BoardChallengeCategories" DROP CONSTRAINT IF EXISTS "BoardChallengeCategories_name_key";`).catch(() => null);
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."BoardBadges" DROP CONSTRAINT IF EXISTS "BoardBadges_name_key";`).catch(() => null);
    await queryInterface.addIndex(categoriesTable, ['journalId', 'name'], { name: 'idx_board_categories_journal_name_unique', unique: true });
    await queryInterface.addIndex(badgesTable, ['journalId', 'name'], { name: 'idx_board_badges_journal_name_unique', unique: true });
    await queryInterface.addIndex(userBadgesTable, ['journalId', 'userId'], { name: 'idx_board_user_badges_journal_user' });
    await queryInterface.addIndex(submissionsTable, ['journalId', 'userId'], { name: 'idx_board_submissions_journal_user' });
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const journalsTable = { tableName: 'BoardJournals', schema };
    const membersTable = { tableName: 'BoardJournalMembers', schema };
    const categoriesTable = { tableName: 'BoardChallengeCategories', schema };
    const challengesTable = { tableName: 'BoardChallenges', schema };
    const badgesTable = { tableName: 'BoardBadges', schema };
    const userBadgesTable = { tableName: 'BoardUserBadges', schema };
    const submissionsTable = { tableName: 'BoardChallengeSubmissions', schema };

    await queryInterface.removeIndex(submissionsTable, 'idx_board_submissions_journal_user').catch(() => null);
    await queryInterface.removeIndex(userBadgesTable, 'idx_board_user_badges_journal_user').catch(() => null);
    await queryInterface.removeIndex(badgesTable, 'idx_board_badges_journal_name_unique').catch(() => null);
    await queryInterface.removeIndex(badgesTable, 'idx_board_badges_journal').catch(() => null);
    await queryInterface.removeIndex(categoriesTable, 'idx_board_categories_journal_name_unique').catch(() => null);
    await queryInterface.removeIndex(challengesTable, 'idx_board_challenges_journal').catch(() => null);
    await queryInterface.removeIndex(categoriesTable, 'idx_board_categories_journal').catch(() => null);
    await queryInterface.removeIndex(membersTable, 'idx_board_journal_members_status').catch(() => null);
    await queryInterface.removeIndex(membersTable, 'idx_board_journal_members_unique').catch(() => null);
    await queryInterface.removeIndex(journalsTable, 'idx_board_journals_name').catch(() => null);

    await queryInterface.dropTable(membersTable).catch(() => null);
    await queryInterface.removeColumn(submissionsTable, 'journalId').catch(() => null);
    await queryInterface.removeColumn(userBadgesTable, 'journalId').catch(() => null);
    await queryInterface.removeColumn(badgesTable, 'journalId').catch(() => null);
    await queryInterface.removeColumn(challengesTable, 'journalId').catch(() => null);
    await queryInterface.removeColumn(categoriesTable, 'journalId').catch(() => null);
    await queryInterface.dropTable(journalsTable).catch(() => null);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_BoardJournalMembers_status";`).catch(() => null);
  }
};
