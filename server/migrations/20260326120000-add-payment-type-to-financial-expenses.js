'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';
const TABLE = { tableName: 'FinancialExpenses', schema: SCHEMA };

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable(TABLE);

    const addIfMissing = async (column, definition) => {
      if (!tableDesc[column]) {
        await queryInterface.addColumn(TABLE, column, definition);
      }
    };

    await addIfMissing('paymentType', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'unico'
    });

    await addIfMissing('entradaAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    await addIfMissing('entradaPaymentMethod', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await addIfMissing('entradaDate', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    await addIfMissing('entradaIsSettled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addIfMissing('entradaSettledAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await addIfMissing('quitacaoAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    await addIfMissing('quitacaoPaymentMethod', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await addIfMissing('quitacaoDate', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    await addIfMissing('quitacaoIsSettled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addIfMissing('quitacaoSettledAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await addIfMissing('supplier', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  async down(queryInterface) {
    const cols = [
      'paymentType',
      'entradaAmount', 'entradaPaymentMethod', 'entradaDate', 'entradaIsSettled', 'entradaSettledAt',
      'quitacaoAmount', 'quitacaoPaymentMethod', 'quitacaoDate', 'quitacaoIsSettled', 'quitacaoSettledAt',
      'supplier'
    ];
    for (const col of cols) {
      await queryInterface.removeColumn(TABLE, col);
    }
  }
};
