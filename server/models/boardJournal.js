const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BoardJournal extends Model {
    static associate(models) {
      BoardJournal.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      BoardJournal.belongsTo(models.User, { foreignKey: 'managerUserId', as: 'manager' });
      BoardJournal.hasMany(models.BoardJournalMember, { foreignKey: 'journalId', as: 'members' });
      BoardJournal.hasMany(models.BoardChallengeCategory, { foreignKey: 'journalId', as: 'categories' });
      BoardJournal.hasMany(models.BoardChallenge, { foreignKey: 'journalId', as: 'challenges' });
      BoardJournal.hasMany(models.BoardBadge, { foreignKey: 'journalId', as: 'badges' });
    }
  }

  BoardJournal.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    coverImageUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    managerUserId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'BoardJournal',
    tableName: 'BoardJournals',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return BoardJournal;
};
