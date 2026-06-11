require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ===== Salas de perguntas =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'LiveQaSessions' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        code: {
          type: Sequelize.STRING(12),
          allowNull: false,
          comment: 'Código curto para o público entrar na sala',
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'open',
          comment: 'open | closed',
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'LiveQaSessions' },
      { fields: ['code'], type: 'unique', name: 'uq_live_qa_sessions_code' }
    );

    // ===== Perguntas =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'LiveQaQuestions' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        sessionId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'LiveQaSessions' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        text: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        authorName: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        authorToken: {
          type: Sequelize.STRING(64),
          allowNull: true,
          comment: 'Identificador anônimo do visitante (localStorage)',
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'active',
          comment: 'active | archived',
        },
        isLive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Sendo exibida na tela ao vivo',
        },
        answered: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        likesCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Cache do total de curtidas para ordenação',
        },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'LiveQaQuestions' },
      ['sessionId', 'status'],
      { name: 'idx_live_qa_questions_session_status' }
    );

    // ===== Curtidas =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'LiveQaLikes' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        questionId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'LiveQaQuestions' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        voterToken: {
          type: Sequelize.STRING(64),
          allowNull: false,
          comment: 'Identificador anônimo do visitante que curtiu',
        },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'LiveQaLikes' },
      { fields: ['questionId', 'voterToken'], type: 'unique', name: 'uq_live_qa_likes_question_voter' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'LiveQaLikes' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'LiveQaQuestions' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'LiveQaSessions' });
  },
};
