const schema = process.env.DB_SCHEMA || 'dev_iecg';

// Plano de estilo da legenda (diretor de arte via IA): fonte, cores, animacao de
// entrada e palavras-chave a destacar. Consumido pelo buildAss no clipRenderService.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'video_clips', schema },
      'stylePlan',
      {
        type: Sequelize.JSONB,
        allowNull: true,
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ tableName: 'video_clips', schema }, 'stylePlan');
  },
};
