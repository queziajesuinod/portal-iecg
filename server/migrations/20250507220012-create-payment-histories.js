// migrations/20250507120500-create-payment-histories.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      { tableName: 'payment_histories', schema: 'dev_iecg' },
      {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        paymentId: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'payments', schema: 'dev_iecg' }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        status: Sequelize.STRING,
        timestamp: Sequelize.DATE,
        notes: Sequelize.TEXT,
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE
      }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'payment_histories', schema: 'dev_iecg' });
  }
};
