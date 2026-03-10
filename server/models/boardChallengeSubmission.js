const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BoardChallengeSubmission extends Model {
    static associate(models) {
      BoardChallengeSubmission.belongsTo(models.BoardJournal, { foreignKey: 'journalId', as: 'journal' });
      BoardChallengeSubmission.belongsTo(models.BoardChallenge, { foreignKey: 'challengeId', as: 'challenge' });
      BoardChallengeSubmission.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      BoardChallengeSubmission.belongsTo(models.User, { foreignKey: 'approvedBy', as: 'approver' });
    }
  }

  BoardChallengeSubmission.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    journalId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    challengeId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    responseType: {
      type: DataTypes.ENUM('question', 'text', 'file', 'form', 'lesson'),
      allowNull: false
    },
    responseText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responseFileUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responsePayload: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    attemptNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    pointsAwarded: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'BoardChallengeSubmission',
    tableName: 'BoardChallengeSubmissions',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return BoardChallengeSubmission;
};
