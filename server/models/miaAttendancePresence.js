'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MiaAttendancePresence extends Model {
    static associate(models) {
      MiaAttendancePresence.belongsTo(models.MiaAttendanceList, {
        foreignKey: 'attendanceListId',
        as: 'lista'
      });
      MiaAttendancePresence.belongsTo(models.Aposentado, {
        foreignKey: 'aposentadoId',
        as: 'aposentado'
      });
    }
  }

  MiaAttendancePresence.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      attendanceListId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      aposentadoId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      presente: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      idadeNoEvento: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      observacao: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'MiaAttendancePresence',
      tableName: 'mia_attendance_presences',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return MiaAttendancePresence;
};
