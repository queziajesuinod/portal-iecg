'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.addColumn(
      { tableName: 'Registrations', schema },
      'pixTransactionId',
      {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'txid retornado pela integracao Pix da Cielo'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'Registrations', schema },
      'pixEndToEndId',
      {
        type: Sequelize.STRING(120),
        allowNull: true,
        comment: 'EndToEndId retornado pela integracao Pix da Cielo'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'RegistrationPayments', schema },
      'pixTransactionId',
      {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'txid retornado pela integracao Pix da Cielo'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'RegistrationPayments', schema },
      'pixEndToEndId',
      {
        type: Sequelize.STRING(120),
        allowNull: true,
        comment: 'EndToEndId retornado pela integracao Pix da Cielo'
      }
    );

    await queryInterface.addIndex(
      { tableName: 'RegistrationPayments', schema },
      ['pixTransactionId'],
      { name: 'idx_registration_payments_pix_transaction_id' }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.removeIndex(
      { tableName: 'RegistrationPayments', schema },
      'idx_registration_payments_pix_transaction_id'
    );

    await queryInterface.removeColumn(
      { tableName: 'RegistrationPayments', schema },
      'pixEndToEndId'
    );
    await queryInterface.removeColumn(
      { tableName: 'RegistrationPayments', schema },
      'pixTransactionId'
    );
    await queryInterface.removeColumn(
      { tableName: 'Registrations', schema },
      'pixEndToEndId'
    );
    await queryInterface.removeColumn(
      { tableName: 'Registrations', schema },
      'pixTransactionId'
    );
  }
};
