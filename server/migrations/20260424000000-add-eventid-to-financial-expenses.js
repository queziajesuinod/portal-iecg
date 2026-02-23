const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'FinancialExpenses', schema },
      'eventId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Events', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    );

    await queryInterface.addIndex(
      { tableName: 'FinancialExpenses', schema },
      ['eventId'],
      { name: 'financial_expenses_event_id_idx' }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      { tableName: 'FinancialExpenses', schema },
      'financial_expenses_event_id_idx'
    );
    await queryInterface.removeColumn(
      { tableName: 'FinancialExpenses', schema },
      'eventId'
    );
  }
};

