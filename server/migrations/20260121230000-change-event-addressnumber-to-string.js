const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn(
      { tableName: 'Events', schema },
      'addressNumber',
      {
        type: Sequelize.STRING(255),
        allowNull: true
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn(
      { tableName: 'Events', schema },
      'addressNumber',
      {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    );
  }
};
