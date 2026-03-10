const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BoardBadge extends Model {
    static associate(models) {
      BoardBadge.belongsTo(models.BoardJournal, { foreignKey: 'journalId', as: 'journal' });
      BoardBadge.hasMany(models.BoardUserBadge, { foreignKey: 'badgeId', as: 'earnedBy' });
    }
  }

  BoardBadge.init({
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
    pointsRequired: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    badgeType: {
      type: DataTypes.ENUM('level', 'achievement', 'special'),
      allowNull: false,
      defaultValue: 'achievement'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'BoardBadge',
    tableName: 'BoardBadges',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return BoardBadge;
};
