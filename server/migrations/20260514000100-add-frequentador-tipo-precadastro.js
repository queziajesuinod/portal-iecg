const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "${SCHEMA}"."enum_PreCadastroPresencas_tipo" ADD VALUE IF NOT EXISTS 'frequentador'`
    );
  },
  async down() {
    // PostgreSQL não suporta remoção de valores de ENUM sem recriar o tipo
  }
};
