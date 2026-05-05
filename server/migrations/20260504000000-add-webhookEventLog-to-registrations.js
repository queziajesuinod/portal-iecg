const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'Registrations', schema },
      'webhookEventLog',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Registro de webhooks já enviados: { "registration.updated:confirmed": "2026-05-04T..." }'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'Registrations', schema },
      'webhookEventLog'
    );
  }
};
