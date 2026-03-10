'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.createTable(
      { tableName: 'UserPermissoes', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()')
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        permissaoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Permissoes', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }
      }
    );

    await queryInterface.addConstraint(
      { tableName: 'UserPermissoes', schema },
      {
        fields: ['userId', 'permissaoId'],
        type: 'unique',
        name: 'UserPermissoes_user_permissao_unico'
      }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'UserPermissoes', schema });
  }
};
