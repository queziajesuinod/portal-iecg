const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn({ tableName: 'forms', schema: SCHEMA }, 'order', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn({ tableName: 'forms', schema: SCHEMA }, 'order');
  }
};
