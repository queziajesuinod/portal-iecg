'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'registro_culto' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
        },
        data: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        horario: {
          type: Sequelize.TIME,
          allowNull: false,
        },
        campusId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'Campus' }, key: 'id' },
        },
        ministerioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'ministerio' }, key: 'id' },
        },
        tipoEventoId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { schema: SCHEMA, tableName: 'tipo_evento' }, key: 'id' },
        },
        quemMinistrou: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        tituloMensagem: {
          type: Sequelize.STRING(300),
          allowNull: false,
        },
        eSerie: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        nomeSerie: {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
        qtdHomens: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        qtdMulheres: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        qtdCriancas: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        qtdBebes: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        qtdVoluntarios: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        qtdOnline: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        teveApelo: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        qtdApelo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        comentarios: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      }
    );

    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'registro_culto' },
      ['data'],
      { name: 'registro_culto_data_idx' }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'registro_culto' },
      ['campusId'],
      { name: 'registro_culto_campus_idx' }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'registro_culto' },
      ['ministerioId'],
      { name: 'registro_culto_ministerio_idx' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'registro_culto' });
  },
};
