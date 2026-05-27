const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      {
        tableName: 'youtube_channels',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        ownerName: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        channelId: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        channelName: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        channelThumbnailUrl: {
          type: Sequelize.STRING(1024),
          allowNull: true,
        },
        uploadsPlaylistId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        oauthRefreshToken: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        oauthAccessToken: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        oauthExpiresAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        oauthScopes: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      { tableName: 'youtube_channels', schema },
      ['active'],
      { name: 'idx_youtube_channels_active' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({
      tableName: 'youtube_channels',
      schema,
    });
  },
};
