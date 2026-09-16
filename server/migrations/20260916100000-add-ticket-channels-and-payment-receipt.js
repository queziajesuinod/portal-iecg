const schema = process.env.DB_SCHEMA || 'dev_iecg';

/**
 * Canais de envio do ticket configuraveis por evento + rastreio do envio por WhatsApp.
 *  - Events.ticketChannels: { email, whatsapp }
 *  - Registrations.ticketWhatsappSentAt / ticketWhatsappLastError (idempotencia do envio WhatsApp)
 * (O comprovante de pagamento e' gerado sob demanda a partir dos dados ja existentes — sem coluna nova.)
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Events" ADD COLUMN IF NOT EXISTS "ticketChannels" JSONB NOT NULL DEFAULT '{"email":true,"whatsapp":false}';`);
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Registrations" ADD COLUMN IF NOT EXISTS "ticketWhatsappSentAt" TIMESTAMP WITH TIME ZONE;`);
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Registrations" ADD COLUMN IF NOT EXISTS "ticketWhatsappLastError" TEXT;`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Registrations" DROP COLUMN IF EXISTS "ticketWhatsappLastError";`);
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Registrations" DROP COLUMN IF EXISTS "ticketWhatsappSentAt";`);
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Events" DROP COLUMN IF EXISTS "ticketChannels";`);
  }
};
