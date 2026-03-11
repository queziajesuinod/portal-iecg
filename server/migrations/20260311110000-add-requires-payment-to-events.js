'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'requiresPayment',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.removeColumn(
      { tableName: 'Events', schema },
      'requiresPayment'
    );
  }
};
