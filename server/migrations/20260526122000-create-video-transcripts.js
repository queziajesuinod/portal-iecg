const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      {
        tableName: 'video_transcripts',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        youtubeVideoId: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: { tableName: 'youtube_videos', schema },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        status: {
          type: Sequelize.ENUM(
            'pending',
            'processing',
            'needs_audio_transcription',
            'done',
            'failed'
          ),
          allowNull: false,
          defaultValue: 'pending',
        },
        source: {
          type: Sequelize.ENUM('caption_manual', 'caption_auto', 'whisper'),
          allowNull: true,
        },
        language: {
          type: Sequelize.STRING(16),
          allowNull: true,
        },
        transcript: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        summary: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        bulletPoints: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        published: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        errorMessage: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        processedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      }
    );

    await queryInterface.addIndex(
      { tableName: 'video_transcripts', schema },
      ['status'],
      { name: 'idx_video_transcripts_status' }
    );
    await queryInterface.addIndex(
      { tableName: 'video_transcripts', schema },
      ['published'],
      { name: 'idx_video_transcripts_published' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({
      tableName: 'video_transcripts',
      schema,
    });
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_video_transcripts_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_video_transcripts_source";');
  },
};
