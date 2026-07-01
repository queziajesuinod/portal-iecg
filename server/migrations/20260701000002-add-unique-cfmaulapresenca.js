module.exports = {
  async up(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.sequelize.query(
      `ALTER TABLE "${schema}"."CfmAulaPresencas"
       ADD CONSTRAINT "CfmAulaPresencas_aulaId_inscricaoId_unique"
       UNIQUE ("aulaId", "inscricaoId")`
    );
  },
  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.sequelize.query(
      `ALTER TABLE "${schema}"."CfmAulaPresencas"
       DROP CONSTRAINT IF EXISTS "CfmAulaPresencas_aulaId_inscricaoId_unique"`
    );
  },
};
