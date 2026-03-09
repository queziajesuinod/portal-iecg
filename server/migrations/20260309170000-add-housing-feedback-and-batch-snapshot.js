const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'EventHousingConfigs', schema },
      'generationFeedbackHistory',
      {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Historico de validacao manual das geracoes de hospedagem'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'EventHousingAllocations', schema },
      'batchId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Snapshot do lote do inscrito no momento da alocacao'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'EventHousingAllocations', schema },
      'batchName',
      {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Snapshot do nome do lote no momento da alocacao'
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      { tableName: 'EventHousingAllocations', schema },
      'batchName'
    );
    await queryInterface.removeColumn(
      { tableName: 'EventHousingAllocations', schema },
      'batchId'
    );
    await queryInterface.removeColumn(
      { tableName: 'EventHousingConfigs', schema },
      'generationFeedbackHistory'
    );
  }
};
