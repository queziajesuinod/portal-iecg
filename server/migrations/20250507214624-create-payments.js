'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      { tableName: 'payments', schema: 'dev_iecg' },
      {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        formSubmissionId: {
          type: Sequelize.UUID,
          references: { model: { tableName: 'form_submissions', schema: 'dev_iecg' }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        amount: Sequelize.FLOAT,
        status: Sequelize.STRING,
        gateway: Sequelize.STRING,
        transactionId: Sequelize.STRING,
        metadata: Sequelize.JSON,
        payerName: Sequelize.STRING,
        payerEmail: Sequelize.STRING,
        payerPhone: Sequelize.STRING,
        returnUrl: Sequelize.STRING,
        checkoutUrl: Sequelize.STRING,
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE
      }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'payments', schema: 'dev_iecg' });
  }
};