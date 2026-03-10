'use strict';

async function dropBoardJournalTables(queryInterface, schema) {
  const tables = [
    { tableName: 'BoardUserBadges', schema },
    { tableName: 'BoardChallengeSubmissions', schema },
    { tableName: 'BoardBadges', schema },
    { tableName: 'BoardChallenges', schema },
    { tableName: 'BoardChallengeCategories', schema },
    { tableName: 'BoardJournalMembers', schema },
    { tableName: 'BoardJournals', schema }
  ];

  for (const table of tables) {
    await queryInterface.dropTable(table).catch(() => null);
  }
}

async function dropBoardJournalEnums(queryInterface, schema) {
  const enumNames = [
    'enum_BoardJournalMembers_status',
    'enum_BoardChallenges_challengeType',
    'enum_BoardChallengeSubmissions_responseType',
    'enum_BoardChallengeSubmissions_status',
    'enum_BoardBadges_badgeType'
  ];

  for (const enumName of enumNames) {
    await queryInterface.sequelize
      .query(`DROP TYPE IF EXISTS "${schema}"."${enumName}";`)
      .catch(() => null);
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const usersTable = { tableName: 'Users', schema };
    const journalsTable = { tableName: 'BoardJournals', schema };
    const membersTable = { tableName: 'BoardJournalMembers', schema };
    const categoriesTable = { tableName: 'BoardChallengeCategories', schema };
    const challengesTable = { tableName: 'BoardChallenges', schema };
    const badgesTable = { tableName: 'BoardBadges', schema };
    const submissionsTable = { tableName: 'BoardChallengeSubmissions', schema };
    const userBadgesTable = { tableName: 'BoardUserBadges', schema };

    // Reset completo do modulo para alinhar o banco ao modelo final multi-diario.
    await dropBoardJournalTables(queryInterface, schema);
    await dropBoardJournalEnums(queryInterface, schema);

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

    await queryInterface.createTable(categoriesTable, {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      icon: {
        type: Sequelize.STRING(80),
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(20),
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

    await queryInterface.createTable(challengesTable, {
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
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      categoryId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: categoriesTable,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      challengeType: {
        type: Sequelize.ENUM('question', 'text', 'file', 'form'),
        allowNull: false,
        defaultValue: 'text'
      },
      questionText: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      questionOptions: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      fileTypes: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      formSchema: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      allowSecondChance: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      secondChancePoints: {
        type: Sequelize.INTEGER,
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

    await queryInterface.createTable(badgesTable, {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      icon: {
        type: Sequelize.STRING(80),
        allowNull: true
      },
      pointsRequired: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      badgeType: {
        type: Sequelize.ENUM('level', 'achievement', 'special'),
        allowNull: false,
        defaultValue: 'achievement'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.createTable(submissionsTable, {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()')
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
      challengeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: challengesTable,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      responseType: {
        type: Sequelize.ENUM('question', 'text', 'file', 'form'),
        allowNull: false
      },
      responseText: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      responseFileUrl: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      responsePayload: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      attemptNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      pointsAwarded: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      submittedAt: {
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
      feedback: {
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

    await queryInterface.createTable(userBadgesTable, {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()')
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
      badgeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: badgesTable,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      earnedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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
    await queryInterface.addIndex(membersTable, ['journalId', 'userId'], {
      name: 'idx_board_journal_members_unique',
      unique: true
    });
    await queryInterface.addIndex(membersTable, ['journalId', 'status'], {
      name: 'idx_board_journal_members_status'
    });
    await queryInterface.addIndex(categoriesTable, ['journalId'], {
      name: 'idx_board_categories_journal'
    });
    await queryInterface.addIndex(categoriesTable, ['journalId', 'name'], {
      name: 'idx_board_categories_journal_name_unique',
      unique: true
    });
    await queryInterface.addIndex(challengesTable, ['journalId'], {
      name: 'idx_board_challenges_journal'
    });
    await queryInterface.addIndex(challengesTable, ['categoryId'], {
      name: 'idx_board_challenges_category'
    });
    await queryInterface.addIndex(challengesTable, ['isActive'], {
      name: 'idx_board_challenges_active'
    });
    await queryInterface.addIndex(badgesTable, ['journalId'], {
      name: 'idx_board_badges_journal'
    });
    await queryInterface.addIndex(badgesTable, ['journalId', 'name'], {
      name: 'idx_board_badges_journal_name_unique',
      unique: true
    });
    await queryInterface.addIndex(submissionsTable, ['journalId', 'userId'], {
      name: 'idx_board_submissions_journal_user'
    });
    await queryInterface.addIndex(submissionsTable, ['challengeId', 'status'], {
      name: 'idx_board_submissions_challenge_status'
    });
    await queryInterface.addIndex(submissionsTable, ['userId', 'challengeId'], {
      name: 'idx_board_submissions_user_challenge'
    });
    await queryInterface.addIndex(userBadgesTable, ['journalId', 'userId'], {
      name: 'idx_board_user_badges_journal_user'
    });
    await queryInterface.addIndex(userBadgesTable, ['journalId', 'userId', 'badgeId'], {
      name: 'idx_board_user_badges_unique',
      unique: true
    });
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await dropBoardJournalTables(queryInterface, schema);
    await dropBoardJournalEnums(queryInterface, schema);
  }
};
