module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.addColumn(
      { schema, tableName: 'video_transcripts' },
      'category',
      {
        type: Sequelize.STRING(80),
        allowNull: true,
      }
    );

    await queryInterface.addIndex(
      { schema, tableName: 'video_transcripts' },
      ['category'],
      { name: 'idx_video_transcripts_category' }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.removeIndex(
      { schema, tableName: 'video_transcripts' },
      'idx_video_transcripts_category'
    );

    await queryInterface.removeColumn(
      { schema, tableName: 'video_transcripts' },
      'category'
    );
  },
};
