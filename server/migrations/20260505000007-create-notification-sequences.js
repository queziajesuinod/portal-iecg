const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable({ tableName: 'NotificationSequences', schema }, {
      id: {
        type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      channel: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'whatsapp' },
      audienceType: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'filter' },
      audienceConfig: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      sendDelayMs: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 500 },
      // draft | active | paused | completed
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { tableName: 'Users', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'NotificationSequences', schema });
  }
};
