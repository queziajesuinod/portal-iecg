const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'NotificationSequences', schema },
      'evolutionInstance',
      {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      { tableName: 'NotificationSequences', schema },
      'evolutionInstance'
    );
  }
};
