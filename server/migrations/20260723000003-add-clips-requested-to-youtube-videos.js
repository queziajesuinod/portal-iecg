module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.addColumn(
      { tableName: 'youtube_videos', schema },
      'clipsRequested',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeColumn({ tableName: 'youtube_videos', schema }, 'clipsRequested');
  },
};
