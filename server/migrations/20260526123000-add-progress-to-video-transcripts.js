const schema = process.env.DB_SCHEMA || 'dev_iecg';
const table = { tableName: 'video_transcripts', schema };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(table, 'progressPercent', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn(table, 'progressStage', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(table, 'progressPercent');
    await queryInterface.removeColumn(table, 'progressStage');
  },
};
