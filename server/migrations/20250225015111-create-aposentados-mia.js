'use strict';
const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable( { schema: SCHEMA, tableName: 'aposentados_mia' }, {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      nome: {
        type: Sequelize.STRING,
        allowNull: false
      },
      data_nascimento: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      filhos: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      endereco: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      telefones: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      estado_civil: {
        type: Sequelize.ENUM('Solteiro', 'Casado', 'Viúvo', 'Divorciado'),
        allowNull: false
      },
      nome_esposo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      profissao: {
        type: Sequelize.STRING,
        allowNull: true
      },
      rede_social: {
        type: Sequelize.STRING,
        allowNull: true
      },
      indicacao: {
        type: Sequelize.STRING,
        allowNull: true
      },
      frequenta_celula: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      batizado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      encontro: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      escolas: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      patologia: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      plano_saude: {
        type: Sequelize.STRING,
        allowNull: true
      },
      hospital: {
        type: Sequelize.STRING,
        allowNull: true
      },
      remedios: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      habilidades: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      analfabeto: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'aposentados_mia' });
  }
};
