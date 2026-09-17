const schema = process.env.DB_SCHEMA || 'dev_iecg';

/**
 * Modo de aprovacao da lista de espera: automatico (padrao) vs manual.
 * Quando false, a vaga liberada NAO oferta sozinha — o admin avalia/aprova (inclusive
 * aprovando alguem de outro lote para a vaga que sobrou).
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Events" ADD COLUMN IF NOT EXISTS "waitlistAutoOffer" BOOLEAN NOT NULL DEFAULT true;`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Events" DROP COLUMN IF EXISTS "waitlistAutoOffer";`);
  }
};
