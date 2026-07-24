module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.addColumn(
      { tableName: 'video_clips', schema },
      'renderProgress',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeColumn({ tableName: 'video_clips', schema }, 'renderProgress');
  },
};
