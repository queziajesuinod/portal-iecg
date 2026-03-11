const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BoardChallenge extends Model {
    static associate(models) {
      BoardChallenge.belongsTo(models.BoardJournal, { foreignKey: 'journalId', as: 'journal' });
      BoardChallenge.belongsTo(models.BoardChallengeCategory, { foreignKey: 'categoryId', as: 'category' });
      BoardChallenge.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      BoardChallenge.hasMany(models.BoardChallengeSubmission, { foreignKey: 'challengeId', as: 'submissions' });
    }
  }

  BoardChallenge.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4
    },
    journalId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    challengeType: {
      type: DataTypes.ENUM('question', 'text', 'file', 'form', 'lesson'),
      allowNull: false,
      defaultValue: 'text'
    },
    contentHtml: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    questionOptions: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    fileTypes: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    formSchema: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    allowSecondChance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    secondChancePoints: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'BoardChallenge',
    tableName: 'BoardChallenges',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return BoardChallenge;
};
