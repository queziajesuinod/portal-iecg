const schema = process.env.DB_SCHEMA || 'dev_iecg';

/**
 * Adiciona horariosPadrao ao vínculo campus × ministério.
 * Formato JSONB: { "0": ["08:30","10:30","17:00","19:00"], "3": ["19:00"] }
 * Chave = dia da semana (0=Dom … 6=Sáb), valor = array de horários esperados.
 * Se vazio/null → validação mantém comportamento antigo (verifica só presença do dia).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'campus_ministerio', schema },
      'horariosPadrao',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'campus_ministerio', schema },
      'horariosPadrao'
    );
  },
};
