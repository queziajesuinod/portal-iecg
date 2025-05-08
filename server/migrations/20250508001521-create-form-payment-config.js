'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      { tableName: 'form_payment_configs', schema: 'dev_iecg' },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false
        },
        formId: {
          type: Sequelize.UUID,
          references: {
            model: { tableName: 'forms', schema: 'dev_iecg' },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        totalAmount: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        minEntry: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        dueDate: {
          type: Sequelize.DATE,
          allowNull: false
        },
        gateway: {
          type: Sequelize.STRING,
          allowNull: false
        },
        returnUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'form_payment_configs', schema: 'dev_iecg' });
  }
};
