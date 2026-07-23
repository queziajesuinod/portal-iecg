const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { tableName: 'video_clips', schema },
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
          references: {
            model: { tableName: 'youtube_videos', schema },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        // Ordem sugerida (0-based) do recorte dentro do video.
        position: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        startSeconds: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: false,
        },
        endSeconds: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
        // Legenda/frase de destaque do recorte (texto puro).
        caption: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        // Por que a IA escolheu este trecho (curadoria/debug).
        reason: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM(
            'suggested',
            'approved',
            'rendering',
            'rendered',
            'publishing',
            'published',
            'discarded',
            'failed'
          ),
          allowNull: false,
          defaultValue: 'suggested',
        },
        // Caminho do arquivo de video gerado (Fase 4).
        filePath: {
          type: Sequelize.STRING(1024),
          allowNull: true,
        },
        fileSizeBytes: {
          type: Sequelize.BIGINT,
          allowNull: true,
        },
        // ID do Short publicado no YouTube (Fase 5).
        youtubeShortId: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        publishedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        errorMessage: {
          type: Sequelize.TEXT,
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
      { tableName: 'video_clips', schema },
      ['youtubeVideoId'],
      { name: 'idx_video_clips_video' }
    );
    await queryInterface.addIndex(
      { tableName: 'video_clips', schema },
      ['status'],
      { name: 'idx_video_clips_status' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'video_clips', schema });
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_video_clips_status";');
  },
};
