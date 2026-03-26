const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BoardJournalManager extends Model {
    static associate(models) {
      BoardJournalManager.belongsTo(models.BoardJournal, { foreignKey: 'journalId', as: 'journal' });
      BoardJournalManager.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  BoardJournalManager.init({
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
    }
  }, {
    sequelize,
    modelName: 'BoardJournalManager',
    tableName: 'BoardJournalManagers',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return BoardJournalManager;
};
