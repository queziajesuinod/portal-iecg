'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Cria o schema se não existir
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA};`);

    // Cria a tabela "Perfis"
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'Perfis' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        descricao: {
          type: Sequelize.STRING
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        }
      }
    );

    // Cria a tabela "Permissoes"
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'Permissoes' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        nome: {
          type: Sequelize.STRING
        },
        descricao: {
          type: Sequelize.STRING
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        }
      }
    );

    // Cria a tabela "Users"
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'Users' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        name: {
          type: Sequelize.STRING
        },
        email: {
          type: Sequelize.STRING
        },
        active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        perfilId: {
          type: Sequelize.UUID,
          references: {
            model: { schema: SCHEMA, tableName: 'Perfis' },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        passwordHash: {
          type: Sequelize.STRING
        },
        image: {
          type: Sequelize.STRING
        },
        salt: {
          type: Sequelize.STRING
        },
        username: {
          type: Sequelize.STRING
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        }
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove as tabelas em ordem inversa para manter a integridade referencial
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'Users' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'Permissoes' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'Perfis' });
  }
};
