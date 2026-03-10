const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BoardChallengeCategory extends Model {
    static associate(models) {
      BoardChallengeCategory.belongsTo(models.BoardJournal, { foreignKey: 'journalId', as: 'journal' });
      BoardChallengeCategory.hasMany(models.BoardChallenge, { foreignKey: 'categoryId', as: 'challenges' });
    }
  }

  BoardChallengeCategory.init({
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'BoardChallengeCategory',
    tableName: 'BoardChallengeCategories',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return BoardChallengeCategory;
};
