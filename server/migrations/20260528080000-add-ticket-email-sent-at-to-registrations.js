const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'Registrations', schema },
      'ticketEmailSentAt',
      {
        type: Sequelize.DATE,
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'Registrations', schema },
      'ticketEmailLastError',
      {
        type: Sequelize.TEXT,
        allowNull: true,
      }
    );
    await queryInterface.addIndex(
      { tableName: 'Registrations', schema },
      ['paymentStatus', 'ticketEmailSentAt'],
      { name: 'idx_registrations_payment_status_ticket_email' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      { tableName: 'Registrations', schema },
      'idx_registrations_payment_status_ticket_email'
    );
    await queryInterface.removeColumn({ tableName: 'Registrations', schema }, 'ticketEmailLastError');
    await queryInterface.removeColumn({ tableName: 'Registrations', schema }, 'ticketEmailSentAt');
  },
};
