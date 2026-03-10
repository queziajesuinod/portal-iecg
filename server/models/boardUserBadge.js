const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BoardUserBadge extends Model {
    static associate(models) {
      BoardUserBadge.belongsTo(models.BoardJournal, { foreignKey: 'journalId', as: 'journal' });
      BoardUserBadge.belongsTo(models.BoardBadge, { foreignKey: 'badgeId', as: 'badge' });
      BoardUserBadge.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  BoardUserBadge.init({
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
    badgeId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    earnedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'BoardUserBadge',
    tableName: 'BoardUserBadges',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return BoardUserBadge;
};
