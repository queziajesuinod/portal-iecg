const { Model, DataTypes } = require('sequelize');

const STATUS_VALUES = [
  'suggested',
  'approved',
  'rendering',
  'rendered',
  'publishing',
  'published',
  'discarded',
  'failed',
];

module.exports = (sequelize) => {
  class VideoClip extends Model {
    static associate(models) {
      VideoClip.belongsTo(models.YoutubeVideo, {
        foreignKey: 'youtubeVideoId',
        as: 'video',
      });
    }
  }

  VideoClip.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      youtubeVideoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      startSeconds: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
      },
      endSeconds: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      caption: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...STATUS_VALUES),
        allowNull: false,
        defaultValue: 'suggested',
      },
      // Progresso da renderizacao (0-100), atualizado pelo ffmpeg.
      renderProgress: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      filePath: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      fileSizeBytes: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      youtubeShortId: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'VideoClip',
      tableName: 'video_clips',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  VideoClip.STATUS = STATUS_VALUES;

  return VideoClip;
};
