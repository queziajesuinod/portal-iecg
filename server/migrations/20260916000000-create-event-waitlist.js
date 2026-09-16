const schema = process.env.DB_SCHEMA || 'dev_iecg';

/**
 * Lista de espera de eventos.
 *  - Nova tabela WaitlistEntries (uma linha por pessoa na fila de um lote).
 *  - Campos de configuracao no Event: waitlistEnabled, waitlistOfferTtlHours, waitlistChannels.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);

    await queryInterface.createTable(
      { tableName: 'WaitlistEntries', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'Events', schema }, key: 'id' },
          onDelete: 'CASCADE'
        },
        batchId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'EventBatches', schema }, key: 'id' },
          onDelete: 'CASCADE',
          comment: 'Lote/setor desejado. A fila e por lote.'
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Quantas vagas a pessoa quer neste lote'
        },
        contactName: { type: Sequelize.STRING(255), allowNull: true },
        contactEmail: { type: Sequelize.STRING(255), allowNull: true },
        contactWhatsapp: { type: Sequelize.STRING(30), allowNull: true },
        contactCpf: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'Somente digitos; usado para impedir 2 entradas da mesma pessoa no mesmo lote'
        },
        payload: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Dados completos da inscricao (attendeesData, buyerData, couponCode, termAcceptances) SEM pagamento'
        },
        status: {
          type: Sequelize.ENUM('waiting', 'offered', 'fulfilled', 'expired', 'cancelled'),
          allowNull: false,
          defaultValue: 'waiting',
          comment: 'waiting=na fila; offered=vaga oferecida (inscricao pending criada); fulfilled=pagou; expired=oferta venceu; cancelled=removido'
        },
        offerToken: {
          type: Sequelize.STRING(64),
          allowNull: true,
          comment: 'Token unico da oferta (link/idempotencia)'
        },
        offeredAt: { type: Sequelize.DATE, allowNull: true },
        offerExpiresAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Prazo para pagar apos a oferta'
        },
        registrationId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'Registrations', schema }, key: 'id' },
          onDelete: 'SET NULL',
          comment: 'Inscricao pending materializada na oferta'
        },
        notifiedCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Quantas vezes esta entrada ja recebeu oferta'
        },
        lastNotifiedChannels: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Resultado do ultimo envio: { email: {...}, whatsapp: {...} }'
        },
        lastError: { type: Sequelize.TEXT, allowNull: true },
        createdAt: {
          type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW
        }
      }
    );

    // Indices (idempotentes — CREATE INDEX IF NOT EXISTS — para re-execucao segura).
    // FIFO por lote:
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS waitlist_batch_status_created_idx ON "${schema}"."WaitlistEntries" ("batchId", "status", "createdAt");`);
    // Varredura de ofertas vencidas:
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS waitlist_status_offerexpires_idx ON "${schema}"."WaitlistEntries" ("status", "offerExpiresAt");`);
    // Listagem no admin por evento:
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS waitlist_event_status_idx ON "${schema}"."WaitlistEntries" ("eventId", "status");`);
    // Token da oferta (unico):
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS waitlist_offer_token_idx ON "${schema}"."WaitlistEntries" ("offerToken") WHERE "offerToken" IS NOT NULL;`);
    // Impede 2 entradas ATIVAS (waiting/offered) da mesma pessoa (CPF) no mesmo lote:
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS waitlist_unique_active_cpf_per_batch
      ON "${schema}"."WaitlistEntries" ("batchId", "contactCpf")
      WHERE "status" IN ('waiting', 'offered') AND "contactCpf" IS NOT NULL;
    `);

    // ===== Config no Event (ADD COLUMN IF NOT EXISTS — idempotente) =====
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Events" ADD COLUMN IF NOT EXISTS "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false;`);
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Events" ADD COLUMN IF NOT EXISTS "waitlistOfferTtlHours" INTEGER NOT NULL DEFAULT 12;`);
    await queryInterface.sequelize.query(`ALTER TABLE "${schema}"."Events" ADD COLUMN IF NOT EXISTS "waitlistChannels" JSONB NOT NULL DEFAULT '{"email":true,"whatsapp":false}';`);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'waitlistChannels');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'waitlistOfferTtlHours');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'waitlistEnabled');
    await queryInterface.dropTable({ tableName: 'WaitlistEntries', schema });
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_WaitlistEntries_status";`);
  }
};
