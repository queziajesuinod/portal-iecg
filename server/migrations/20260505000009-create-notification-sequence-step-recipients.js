const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable({ tableName: 'NotificationSequenceStepRecipients', schema }, {
      id: {
        type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
      },
      stepId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'NotificationSequenceSteps', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sourceType: { type: Sequelize.STRING(50), allowNull: true },
      sourceId: { type: Sequelize.UUID, allowNull: true },
      name: { type: Sequelize.STRING(200), allowNull: true },
      contact: { type: Sequelize.STRING(200), allowNull: false },
      resolvedMessage: { type: Sequelize.TEXT, allowNull: true },
      // pending | sent | delivered | read | failed
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      sentAt: { type: Sequelize.DATE, allowNull: true },
      errorMessage: { type: Sequelize.TEXT, allowNull: true },
      providerResponse: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addIndex(
      { tableName: 'NotificationSequenceStepRecipients', schema },
      ['stepId', 'status'],
      { name: 'idx_seq_step_recipients_step_status' }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'NotificationSequenceStepRecipients', schema });
  }
};
