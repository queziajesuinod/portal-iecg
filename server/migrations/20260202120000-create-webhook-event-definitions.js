'use strict';

const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'webhook_event_definitions',
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.literal('gen_random_uuid()')
        },
        eventKey: {
          type: Sequelize.STRING(128),
          allowNull: false,
          unique: true
        },
        label: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        tableName: {
          type: Sequelize.STRING(128),
          allowNull: false
        },
        fieldName: {
          type: Sequelize.STRING(128),
          allowNull: false
        },
        changeType: {
          type: Sequelize.ENUM('INSERT', 'UPDATE', 'DELETE'),
          allowNull: false,
          defaultValue: 'UPDATE'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      },
      { schema }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('webhook_event_definitions', { schema });
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_webhook_event_definitions_changeType";');
  }
};
