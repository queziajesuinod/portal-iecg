const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MemberDuplicateDismissal extends Model {
    static associate(models) {
      if (models.Member) {
        MemberDuplicateDismissal.belongsTo(models.Member, {
          foreignKey: 'firstMemberId',
          as: 'firstMember'
        });
        MemberDuplicateDismissal.belongsTo(models.Member, {
          foreignKey: 'secondMemberId',
          as: 'secondMember'
        });
      }

      if (models.User) {
        MemberDuplicateDismissal.belongsTo(models.User, {
          foreignKey: 'dismissedBy',
          as: 'dismissedByUser'
        });
      }
    }
  }

  MemberDuplicateDismissal.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstMemberId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    secondMemberId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    dismissedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    reasonSnapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'MemberDuplicateDismissal',
    tableName: 'MemberDuplicateDismissals',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
    updatedAt: false
  });

  return MemberDuplicateDismissal;
};
