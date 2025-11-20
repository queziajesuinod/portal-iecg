'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MiaAttendanceList extends Model {
    static associate(models) {
      MiaAttendanceList.hasMany(models.MiaAttendancePresence, {
        as: 'presencas',
        foreignKey: 'attendanceListId'
      });
    }
  }

  MiaAttendanceList.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      titulo: {
        type: DataTypes.STRING,
        allowNull: false
      },
      dataReferencia: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      faixaEtariaMin: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      faixaEtariaMax: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'MiaAttendanceList',
      tableName: 'mia_attendance_lists',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return MiaAttendanceList;
};
