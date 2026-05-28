const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'youtube_videos', schema },
      'audioPath',
      {
        type: Sequelize.STRING(1024),
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'youtube_videos', schema },
      'audioSizeBytes',
      {
        type: Sequelize.BIGINT,
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'youtube_videos', schema },
      'audioUploadedAt',
      {
        type: Sequelize.DATE,
        allowNull: true,
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn({ tableName: 'youtube_videos', schema }, 'audioUploadedAt');
    await queryInterface.removeColumn({ tableName: 'youtube_videos', schema }, 'audioSizeBytes');
    await queryInterface.removeColumn({ tableName: 'youtube_videos', schema }, 'audioPath');
  },
};
