'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RegistroCulto extends Model {
    static associate(models) {
      if (models.Campus) {
        RegistroCulto.belongsTo(models.Campus, { foreignKey: 'campusId', as: 'campus' });
      }
      if (models.Ministerio) {
        RegistroCulto.belongsTo(models.Ministerio, { foreignKey: 'ministerioId', as: 'ministerio' });
      }
      if (models.TipoEvento) {
        RegistroCulto.belongsTo(models.TipoEvento, { foreignKey: 'tipoEventoId', as: 'tipoEvento' });
      }
      if (models.Ministro) {
        RegistroCulto.belongsToMany(models.Ministro, {
          through: 'registro_culto_ministro',
          foreignKey: 'registroCultoId',
          otherKey: 'ministroId',
          as: 'ministros',
        });
      }
    }
  }

  RegistroCulto.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      data: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      horario: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      campusId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      ministerioId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      tipoEventoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      quemMinistrou: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      tituloMensagem: {
        type: DataTypes.STRING(300),
        allowNull: false,
      },
      eSerie: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      nomeSerie: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      qtdHomens: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      qtdMulheres: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      qtdCriancas: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      qtdBebes: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      qtdVoluntarios: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      qtdOnline: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      teveApelo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      qtdApelo: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      comentarios: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'RegistroCulto',
      tableName: 'registro_culto',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return RegistroCulto;
};
