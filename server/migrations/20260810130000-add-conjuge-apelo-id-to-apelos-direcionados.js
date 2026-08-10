require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'conjuge_apelo_id',
      {
        type: Sequelize.UUID,
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'conjuge_apelo_id'
    );
  }
};
