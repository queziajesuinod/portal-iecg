const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BoardJournalMember extends Model {
    static associate(models) {
      BoardJournalMember.belongsTo(models.BoardJournal, { foreignKey: 'journalId', as: 'journal' });
      BoardJournalMember.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      BoardJournalMember.belongsTo(models.User, { foreignKey: 'approvedBy', as: 'approver' });
    }
  }

  BoardJournalMember.init({
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    requestedAt: {
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
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'BoardJournalMember',
    tableName: 'BoardJournalMembers',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return BoardJournalMember;
};
