'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      { tableName: 'forms', schema: 'dev_iecg' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false
        },
        name: { type: Sequelize.STRING, allowNull: false },
        description: Sequelize.TEXT,
        hasPayment: { type: Sequelize.BOOLEAN, defaultValue: false },
        isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
        startDate: { type: Sequelize.DATE, allowNull: true },
        endDate: { type: Sequelize.DATE, allowNull: true },
        formTypeId: {
          type: Sequelize.UUID,
          references: { model: { tableName: 'form_types', schema: 'dev_iecg' }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE
      }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'forms', schema: 'dev_iecg' });
  }
};