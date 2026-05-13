const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable({ tableName: 'EvolutionWebhookLogs', schema }, {
      id: {
        type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
      },
      event: { type: Sequelize.STRING(60), allowNull: true },
      instance: { type: Sequelize.STRING(100), allowNull: true },
      messageId: { type: Sequelize.STRING(255), allowNull: true },
      mappedStatus: { type: Sequelize.STRING(30), allowNull: true },
      updatedRecords: { type: Sequelize.JSONB, allowNull: true },
      rawPayload: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex(
      { tableName: 'EvolutionWebhookLogs', schema },
      ['createdAt'],
      { name: 'idx_evolution_webhook_logs_created_at' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'EvolutionWebhookLogs', schema });
  }
};
