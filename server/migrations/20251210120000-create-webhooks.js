'use strict';

const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    await queryInterface.createTable(
      {
        tableName: 'webhooks',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        url: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        events: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        secret: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({
      tableName: 'webhooks',
      schema,
    });
  },
};
