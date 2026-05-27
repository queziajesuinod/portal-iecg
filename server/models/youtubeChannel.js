const { Model, DataTypes } = require('sequelize');
const tokenCrypto = require('../utils/tokenCrypto');

module.exports = (sequelize) => {
  class YoutubeChannel extends Model {
    static associate(models) {
      YoutubeChannel.hasMany(models.YoutubeVideo, {
        foreignKey: 'youtubeChannelId',
        as: 'videos',
      });
    }

    setRefreshToken(plain) {
      this.oauthRefreshToken = plain ? tokenCrypto.encrypt(plain) : null;
    }

    getRefreshToken() {
      return this.oauthRefreshToken ? tokenCrypto.decrypt(this.oauthRefreshToken) : null;
    }

    setAccessToken(plain, expiresAt) {
      this.oauthAccessToken = plain ? tokenCrypto.encrypt(plain) : null;
      this.oauthExpiresAt = expiresAt || null;
    }

    getAccessToken() {
      return this.oauthAccessToken ? tokenCrypto.decrypt(this.oauthAccessToken) : null;
    }

    setYtDlpCookies(plain) {
      if (plain) {
        this.ytDlpCookies = tokenCrypto.encrypt(plain);
        this.ytDlpCookiesUpdatedAt = new Date();
      } else {
        this.ytDlpCookies = null;
        this.ytDlpCookiesUpdatedAt = null;
      }
    }

    getYtDlpCookies() {
      return this.ytDlpCookies ? tokenCrypto.decrypt(this.ytDlpCookies) : null;
    }
  }

  YoutubeChannel.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      ownerName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      channelId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      channelName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      channelThumbnailUrl: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      uploadsPlaylistId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      oauthRefreshToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      oauthAccessToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      oauthExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      oauthScopes: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ytDlpCookies: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ytDlpCookiesUpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'YoutubeChannel',
      tableName: 'youtube_channels',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
      defaultScope: {
        attributes: { exclude: ['oauthRefreshToken', 'oauthAccessToken', 'ytDlpCookies'] },
      },
      scopes: {
        withTokens: {
          attributes: { include: ['oauthRefreshToken', 'oauthAccessToken', 'ytDlpCookies'] },
        },
      },
    }
  );

  return YoutubeChannel;
};
