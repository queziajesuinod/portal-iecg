const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'EventHousingConfigs', schema },
      'customRulesVersion',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Versao atual das instrucoes de hospedagem'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'EventHousingConfigs', schema },
      'customRulesHistory',
      {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Historico de alteracoes das instrucoes'
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      { tableName: 'EventHousingConfigs', schema },
      'customRulesHistory'
    );

    await queryInterface.removeColumn(
      { tableName: 'EventHousingConfigs', schema },
      'customRulesVersion'
    );
  }
};
