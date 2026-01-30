'use strict';

const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "${schema}"."enum_PaymentOptions_paymentType" ADD VALUE IF NOT EXISTS 'offline';`
    );
  },

  down: async () => {
    // Não é possível remover valores de enum no Postgres sem recriar o tipo
  }
};
