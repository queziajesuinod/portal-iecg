const schema = process.env.DB_SCHEMA || 'dev_iecg';

// Adiciona os campos de contato de emergencia ao aceite do termo (auditoria).
// Coletados na assinatura quando nao vem nos dados do inscrito. Idempotente.
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { tableName: 'RegistrationTermAcceptances', schema };
    const desc = await queryInterface.describeTable(table);
    if (!desc.emergencyContactName) {
      await queryInterface.addColumn(table, 'emergencyContactName', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Nome do contato de emergencia (informado no termo)'
      });
    }
    if (!desc.emergencyContactPhone) {
      await queryInterface.addColumn(table, 'emergencyContactPhone', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'WhatsApp do contato de emergencia (informado no termo)'
      });
    }
  },

  async down(queryInterface) {
    const table = { tableName: 'RegistrationTermAcceptances', schema };
    await queryInterface.removeColumn(table, 'emergencyContactName').catch(() => {});
    await queryInterface.removeColumn(table, 'emergencyContactPhone').catch(() => {});
  }
};
