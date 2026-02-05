module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.addColumn(
      { tableName: 'RegistrationPayments', schema },
      'efiCommissionAmount',
      {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Valor da comissão enviada para a conta Efí'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'RegistrationPayments', schema },
      'efiCommissionSentAt',
      {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Momento em que a comissão para Efí foi disparada'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'RegistrationPayments', schema },
      'efiCommissionResponse',
      {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Dados retornados pela API Efí na requisição do Pix'
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.removeColumn(
      { tableName: 'RegistrationPayments', schema },
      'efiCommissionResponse'
    );
    await queryInterface.removeColumn(
      { tableName: 'RegistrationPayments', schema },
      'efiCommissionSentAt'
    );
    await queryInterface.removeColumn(
      { tableName: 'RegistrationPayments', schema },
      'efiCommissionAmount'
    );
  }
};
