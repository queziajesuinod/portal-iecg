const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "${schema}"."enum_Registrations_paymentStatus" ADD VALUE IF NOT EXISTS 'expired';`
    );
  },

  down: async () => {
    // Removing values from Postgres enums is non-trivial; leave as no-op.
  }
};
