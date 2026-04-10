'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Voluntariado extends Model {
    static associate(models) {
      if (models.Member) {
        Voluntariado.belongsTo(models.Member, {
          foreignKey: 'memberId',
          as: 'membro'
        });
      }
      if (models.AreaVoluntariado) {
        Voluntariado.belongsTo(models.AreaVoluntariado, {
          foreignKey: 'areaVoluntariadoId',
          as: 'area'
        });
      }
    }
  }

  Voluntariado.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
      },
      memberId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      areaVoluntariadoId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      dataInicio: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      dataFim: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('PENDENTE', 'APROVADO', 'ENCERRADO'),
        allowNull: false,
        defaultValue: 'PENDENTE'
      },
      observacao: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Voluntariado',
      tableName: 'voluntariado',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return Voluntariado;
};
