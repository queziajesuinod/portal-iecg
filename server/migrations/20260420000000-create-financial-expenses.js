const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);

    await queryInterface.createTable(
      { tableName: 'FinancialExpenses', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        description: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        paymentMethod: {
          type: Sequelize.ENUM('pix', 'credit_card', 'debit_card', 'boleto', 'cash', 'transfer', 'other'),
          allowNull: false,
          defaultValue: 'pix'
        },
        isSettled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        expenseDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        settledAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          }
        },
        updatedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          }
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }
    );

    await queryInterface.addIndex(
      { tableName: 'FinancialExpenses', schema },
      ['expenseDate']
    );
    await queryInterface.addIndex(
      { tableName: 'FinancialExpenses', schema },
      ['isSettled']
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'FinancialExpenses', schema });
  }
};
