const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'video_transcripts', schema },
      'speaker',
      {
        type: Sequelize.STRING(160),
        allowNull: true,
      }
    );
    await queryInterface.addIndex(
      { tableName: 'video_transcripts', schema },
      ['speaker'],
      { name: 'idx_video_transcripts_speaker' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex({ tableName: 'video_transcripts', schema }, 'idx_video_transcripts_speaker');
    await queryInterface.removeColumn({ tableName: 'video_transcripts', schema }, 'speaker');
  },
};
