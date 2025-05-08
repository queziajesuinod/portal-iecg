'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      { tableName: 'form_fields', schema: 'dev_iecg' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false
        },
        formId: {
          type: Sequelize.UUID,
          references: { model: { tableName: 'forms', schema: 'dev_iecg' }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        label: Sequelize.STRING,
        type: Sequelize.STRING,
        required: { type: Sequelize.BOOLEAN, defaultValue: false },
        options: Sequelize.JSON,
        status: { type: Sequelize.BOOLEAN, defaultValue: false },
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE
      }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'form_fields', schema: 'dev_iecg' });
  }
};