const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      {
        tableName: 'youtube_videos',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        youtubeChannelId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'youtube_channels', schema },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        videoId: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        title: {
          type: Sequelize.STRING(512),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        publishedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        thumbnailUrl: {
          type: Sequelize.STRING(1024),
          allowNull: true,
        },
        durationSeconds: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        hasCaption: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        hasManualCaption: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
        },
        hasAutoCaption: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
        },
        captionLanguages: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        captionCheckedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        lastSyncedAt: {
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
      { tableName: 'youtube_videos', schema },
      ['youtubeChannelId'],
      { name: 'idx_youtube_videos_channel' }
    );
    await queryInterface.addIndex(
      { tableName: 'youtube_videos', schema },
      ['publishedAt'],
      { name: 'idx_youtube_videos_published_at' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({
      tableName: 'youtube_videos',
      schema,
    });
  },
};
