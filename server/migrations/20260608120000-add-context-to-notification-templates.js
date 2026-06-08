const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'NotificationTemplates', schema },
      'context',
      { type: Sequelize.STRING(50), allowNull: true, defaultValue: null }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'NotificationTemplates', schema },
      'context'
    );
  }
};
