'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MemberActivityType extends Model {
    static associate(models) {
      if (models.MemberActivity) {
        MemberActivityType.hasMany(models.MemberActivity, {
          foreignKey: 'activityType',
          sourceKey: 'code',
          as: 'activities'
        });
      }
    }
  }

  MemberActivityType.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    defaultPoints: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'MemberActivityType',
    tableName: 'MemberActivityTypes',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return MemberActivityType;
};
