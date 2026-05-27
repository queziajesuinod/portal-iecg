const schema = process.env.DB_SCHEMA || 'dev_iecg';
const table = { tableName: 'video_transcripts', schema };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(table, 'seoKeywords', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn(table, 'seoMetaTitle', {
      type: Sequelize.STRING(160),
      allowNull: true,
    });
    await queryInterface.addColumn(table, 'seoMetaDescription', {
      type: Sequelize.STRING(320),
      allowNull: true,
    });
    await queryInterface.addColumn(table, 'seoSlug', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });

    await queryInterface.addIndex(table, ['seoSlug'], { name: 'idx_video_transcripts_seo_slug' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(table, 'idx_video_transcripts_seo_slug');
    await queryInterface.removeColumn(table, 'seoKeywords');
    await queryInterface.removeColumn(table, 'seoMetaTitle');
    await queryInterface.removeColumn(table, 'seoMetaDescription');
    await queryInterface.removeColumn(table, 'seoSlug');
  },
};
