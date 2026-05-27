const schema = process.env.DB_SCHEMA || 'dev_iecg';
const table = { tableName: 'youtube_videos', schema };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(table, 'ignored', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn(table, 'ignoreReason', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });

    await queryInterface.addIndex(table, ['ignored'], { name: 'idx_youtube_videos_ignored' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(table, 'idx_youtube_videos_ignored');
    await queryInterface.removeColumn(table, 'ignored');
    await queryInterface.removeColumn(table, 'ignoreReason');
  },
};
