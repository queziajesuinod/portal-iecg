const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class YoutubeVideo extends Model {
    static associate(models) {
      YoutubeVideo.belongsTo(models.YoutubeChannel, {
        foreignKey: 'youtubeChannelId',
        as: 'channel',
      });
      YoutubeVideo.hasOne(models.VideoTranscript, {
        foreignKey: 'youtubeVideoId',
        as: 'transcript',
      });
    }
  }

  YoutubeVideo.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      youtubeChannelId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      videoId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      thumbnailUrl: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      hasCaption: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      hasManualCaption: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      hasAutoCaption: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      captionLanguages: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      captionCheckedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ignored: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ignoreReason: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'YoutubeVideo',
      tableName: 'youtube_videos',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return YoutubeVideo;
};
