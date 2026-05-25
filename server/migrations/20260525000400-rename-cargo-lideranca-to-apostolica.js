module.exports = {
  up: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.sequelize.query(
      `ALTER TYPE "${schema}"."enum_MemberCargos_cargo" RENAME VALUE 'lideranca' TO 'lideranca_apostolica';`
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.sequelize.query(
      `ALTER TYPE "${schema}"."enum_MemberCargos_cargo" RENAME VALUE 'lideranca_apostolica' TO 'lideranca';`
    );
  }
};
