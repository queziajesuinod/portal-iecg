const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn({ tableName: 'NotificationGroups', schema }, 'previewCount', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn({ tableName: 'NotificationGroups', schema }, 'previewUpdatedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn({ tableName: 'NotificationGroups', schema }, 'previewCount');
    await queryInterface.removeColumn({ tableName: 'NotificationGroups', schema }, 'previewUpdatedAt');
  }
};
