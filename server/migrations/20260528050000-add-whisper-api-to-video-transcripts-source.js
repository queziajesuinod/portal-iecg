const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface) => {
    const enumName = `"${schema}"."enum_video_transcripts_source"`;
    await queryInterface.sequelize.query(
      `ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS 'whisper_api';`
    );
  },

  down: async () => {
    // Postgres nao suporta remocao de valor de enum sem recriar a coluna.
    // Migration de remocao seria destrutiva — deixar sem-op.
  },
};
