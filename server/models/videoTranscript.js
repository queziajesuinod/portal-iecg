const { Model, DataTypes } = require('sequelize');

const STATUS_VALUES = ['pending', 'processing', 'needs_audio_transcription', 'done', 'failed'];
const SOURCE_VALUES = ['caption_manual', 'caption_auto', 'whisper', 'whisper_api'];

module.exports = (sequelize) => {
  class VideoTranscript extends Model {
    static associate(models) {
      VideoTranscript.belongsTo(models.YoutubeVideo, {
        foreignKey: 'youtubeVideoId',
        as: 'video',
      });
    }
  }

  VideoTranscript.init(
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
        unique: true,
      },
      status: {
        type: DataTypes.ENUM(...STATUS_VALUES),
        allowNull: false,
        defaultValue: 'pending',
      },
      source: {
        type: DataTypes.ENUM(...SOURCE_VALUES),
        allowNull: true,
      },
      language: {
        type: DataTypes.STRING(16),
        allowNull: true,
      },
      transcript: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Segmentos com timestamps do Whisper: [{ start, end, text }]. Base para recortes/Shorts.
      segments: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      bulletPoints: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      published: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      progressPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      progressStage: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      seoKeywords: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      seoMetaTitle: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      seoMetaDescription: {
        type: DataTypes.STRING(320),
        allowNull: true,
      },
      seoSlug: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      speaker: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'VideoTranscript',
      tableName: 'video_transcripts',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  VideoTranscript.STATUS = STATUS_VALUES;
  VideoTranscript.SOURCE = SOURCE_VALUES;

  return VideoTranscript;
};
