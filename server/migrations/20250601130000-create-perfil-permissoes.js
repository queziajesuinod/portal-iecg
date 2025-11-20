'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'PerfilPermissoes' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
        },
        perfilId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { schema: SCHEMA, tableName: 'Perfis' },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        permissaoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { schema: SCHEMA, tableName: 'Permissoes' },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
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

    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'PerfilPermissoes' },
      {
        fields: ['perfilId', 'permissaoId'],
        type: 'unique',
        name: 'PerfilPermissoes_perfil_permissao_unico',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'PerfilPermissoes' });
  },
};
