module.exports = {
  up: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.sequelize.query(
      `ALTER TYPE "${schema}"."enum_CelulaMembroVinculos_origem" ADD VALUE IF NOT EXISTS 'pre_cadastro'`
    );
  },

  down: async () => {
    // Remover valor de enum no PostgreSQL requer recriar o tipo — não implementado
  }
};
