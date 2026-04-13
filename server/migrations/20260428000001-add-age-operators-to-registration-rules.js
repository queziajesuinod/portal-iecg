'use strict';

const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TYPE "${schema}"."enum_EventRegistrationRules_operator"
        ADD VALUE IF NOT EXISTS 'age_gte';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "${schema}"."enum_EventRegistrationRules_operator"
        ADD VALUE IF NOT EXISTS 'age_lte';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "${schema}"."enum_EventRegistrationRules_operator"
        ADD VALUE IF NOT EXISTS 'age_gt';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "${schema}"."enum_EventRegistrationRules_operator"
        ADD VALUE IF NOT EXISTS 'age_lt';
    `);
  },

  down: async () => {
    // PostgreSQL não suporta remoção de valores de ENUM nativamente
    // Para reverter seria necessário recriar o tipo — não implementado
  }
};
