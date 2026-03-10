'use strict';

const { v4: uuidv4 } = require('uuid');

const ADMIN_PERMISSION = {
  nome: 'DIARIO_BORDO_ADMIN',
  descricao: 'Gerenciar o modulo Diario de Bordo'
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const now = new Date();
    const usersTable = { tableName: 'Users', schema };
    const permissoesTable = { tableName: 'Permissoes', schema };
    const perfisTable = { tableName: 'Perfis', schema };
    const perfilPermissoesTable = { tableName: 'PerfilPermissoes', schema };

    const usersDefinition = await queryInterface.describeTable(usersTable);
    if (!usersDefinition.points) {
      await queryInterface.addColumn(usersTable, 'points', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    await queryInterface.createTable({ tableName: 'BoardChallengeCategories', schema }, {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
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

    await queryInterface.createTable({ tableName: 'BoardChallenges', schema }, {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()')
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
          model: { tableName: 'BoardChallengeCategories', schema },
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

    await queryInterface.createTable({ tableName: 'BoardChallengeSubmissions', schema }, {
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
      challengeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'BoardChallenges', schema },
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

    await queryInterface.createTable({ tableName: 'BoardBadges', schema }, {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
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

    await queryInterface.createTable({ tableName: 'BoardUserBadges', schema }, {
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
      badgeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'BoardBadges', schema },
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

    await queryInterface.addIndex({ tableName: 'BoardChallenges', schema }, ['categoryId'], {
      name: 'idx_board_challenges_category'
    });
    await queryInterface.addIndex({ tableName: 'BoardChallenges', schema }, ['isActive'], {
      name: 'idx_board_challenges_active'
    });
    await queryInterface.addIndex({ tableName: 'BoardChallengeSubmissions', schema }, ['challengeId', 'status'], {
      name: 'idx_board_submissions_challenge_status'
    });
    await queryInterface.addIndex({ tableName: 'BoardChallengeSubmissions', schema }, ['userId', 'challengeId'], {
      name: 'idx_board_submissions_user_challenge'
    });
    await queryInterface.addIndex({ tableName: 'BoardUserBadges', schema }, ['userId'], {
      name: 'idx_board_user_badges_user'
    });
    await queryInterface.addIndex({ tableName: 'BoardUserBadges', schema }, ['userId', 'badgeId'], {
      name: 'idx_board_user_badges_unique',
      unique: true
    });

    const [existingPermission] = await queryInterface.sequelize.query(
      `SELECT id FROM "${schema}"."Permissoes" WHERE nome = :nome LIMIT 1`,
      {
        replacements: { nome: ADMIN_PERMISSION.nome },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    let permissionId = existingPermission?.id || null;
    if (!permissionId) {
      permissionId = uuidv4();
      await queryInterface.bulkInsert(permissoesTable, [{
        id: permissionId,
        nome: ADMIN_PERMISSION.nome,
        descricao: ADMIN_PERMISSION.descricao,
        createdAt: now,
        updatedAt: now
      }]);
    }

    const [adminPerfil] = await queryInterface.sequelize.query(
      `SELECT id FROM "${schema}"."Perfis" WHERE descricao = :descricao LIMIT 1`,
      {
        replacements: { descricao: 'Administrador' },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (adminPerfil?.id) {
      const [existingLink] = await queryInterface.sequelize.query(
        `SELECT id FROM "${schema}"."PerfilPermissoes" WHERE "perfilId" = :perfilId AND "permissaoId" = :permissaoId LIMIT 1`,
        {
          replacements: { perfilId: adminPerfil.id, permissaoId: permissionId },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (!existingLink) {
        await queryInterface.bulkInsert(perfilPermissoesTable, [{
          id: uuidv4(),
          perfilId: adminPerfil.id,
          permissaoId: permissionId,
          createdAt: now,
          updatedAt: now
        }]);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const usersTable = { tableName: 'Users', schema };

    await queryInterface.removeIndex({ tableName: 'BoardUserBadges', schema }, 'idx_board_user_badges_unique').catch(() => null);
    await queryInterface.removeIndex({ tableName: 'BoardUserBadges', schema }, 'idx_board_user_badges_user').catch(() => null);
    await queryInterface.removeIndex({ tableName: 'BoardChallengeSubmissions', schema }, 'idx_board_submissions_user_challenge').catch(() => null);
    await queryInterface.removeIndex({ tableName: 'BoardChallengeSubmissions', schema }, 'idx_board_submissions_challenge_status').catch(() => null);
    await queryInterface.removeIndex({ tableName: 'BoardChallenges', schema }, 'idx_board_challenges_active').catch(() => null);
    await queryInterface.removeIndex({ tableName: 'BoardChallenges', schema }, 'idx_board_challenges_category').catch(() => null);

    await queryInterface.dropTable({ tableName: 'BoardUserBadges', schema });
    await queryInterface.dropTable({ tableName: 'BoardBadges', schema });
    await queryInterface.dropTable({ tableName: 'BoardChallengeSubmissions', schema });
    await queryInterface.dropTable({ tableName: 'BoardChallenges', schema });
    await queryInterface.dropTable({ tableName: 'BoardChallengeCategories', schema });

    const usersDefinition = await queryInterface.describeTable(usersTable);
    if (usersDefinition.points) {
      await queryInterface.removeColumn(usersTable, 'points');
    }

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_BoardChallenges_challengeType";`).catch(() => null);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_BoardChallengeSubmissions_responseType";`).catch(() => null);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_BoardChallengeSubmissions_status";`).catch(() => null);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_BoardBadges_badgeType";`).catch(() => null);
  }
};
