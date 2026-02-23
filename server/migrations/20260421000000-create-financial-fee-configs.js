const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);

    await queryInterface.createTable(
      { tableName: 'FinancialFeeConfigs', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        pixPercent: {
          type: Sequelize.DECIMAL(8, 4),
          allowNull: false,
          defaultValue: 0
        },
        pixFixedFee: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        creditCardDefaultPercent: {
          type: Sequelize.DECIMAL(8, 4),
          allowNull: false,
          defaultValue: 0
        },
        creditCardFixedFee: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        creditCardInstallmentPercent: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: {}
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
      { tableName: 'FinancialFeeConfigs', schema },
      ['isActive']
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'FinancialFeeConfigs', schema });
  }
};
