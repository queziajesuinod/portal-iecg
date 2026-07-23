module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.addColumn(
      { tableName: 'video_transcripts', schema },
      'segments',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeColumn({ tableName: 'video_transcripts', schema }, 'segments');
  },
};
