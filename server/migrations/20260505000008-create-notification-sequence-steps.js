const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable({ tableName: 'NotificationSequenceSteps', schema }, {
      id: {
        type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
      },
      sequenceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'NotificationSequences', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      stepOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      name: { type: Sequelize.STRING(200), allowNull: true },
      templateId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { tableName: 'NotificationTemplates', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      customMessage: { type: Sequelize.TEXT, allowNull: true },
      scheduledAt: { type: Sequelize.DATE, allowNull: true },
      // pending | sending | sent | failed
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      sentAt: { type: Sequelize.DATE, allowNull: true },
      totalRecipients: { type: Sequelize.INTEGER, allowNull: true },
      totalSent: { type: Sequelize.INTEGER, allowNull: true },
      totalFailed: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'NotificationSequenceSteps', schema });
  }
};
