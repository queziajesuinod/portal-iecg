const schema = process.env.DB_SCHEMA || 'dev_iecg';
const table = { tableName: 'youtube_channels', schema };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(table, 'ytDlpCookies', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn(table, 'ytDlpCookiesUpdatedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(table, 'ytDlpCookies');
    await queryInterface.removeColumn(table, 'ytDlpCookiesUpdatedAt');
  },
};
