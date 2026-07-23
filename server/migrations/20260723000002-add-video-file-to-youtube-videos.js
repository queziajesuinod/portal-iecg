module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = { tableName: 'youtube_videos', schema };
    await queryInterface.addColumn(table, 'videoPath', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });
    await queryInterface.addColumn(table, 'videoSizeBytes', {
      type: Sequelize.BIGINT,
      allowNull: true,
    });
    await queryInterface.addColumn(table, 'videoUploadedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = { tableName: 'youtube_videos', schema };
    await queryInterface.removeColumn(table, 'videoPath');
    await queryInterface.removeColumn(table, 'videoSizeBytes');
    await queryInterface.removeColumn(table, 'videoUploadedAt');
  },
};
