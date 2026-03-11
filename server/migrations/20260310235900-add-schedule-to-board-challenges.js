module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = { tableName: 'BoardChallenges', schema };

    await queryInterface.addColumn(table, 'startDate', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    await queryInterface.addColumn(table, 'endDate', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = { tableName: 'BoardChallenges', schema };

    await queryInterface.removeColumn(table, 'endDate');
    await queryInterface.removeColumn(table, 'startDate');
  }
};
