const schema = process.env.DB_SCHEMA || 'dev_iecg';

// Lista de campos padrao a coletar na assinatura quando nao vierem do inscrito
// (ex.: RESPONSAVEL_CPF, CONTATO_EMERGENCIA_NOME, CONTATO_EMERGENCIA_WHATSAPP). Idempotente.
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { tableName: 'EventLiabilityTerms', schema };
    const desc = await queryInterface.describeTable(table);
    if (!desc.collectFields) {
      await queryInterface.addColumn(table, 'collectFields', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Campos padrao a coletar na assinatura quando ausentes no inscrito',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ tableName: 'EventLiabilityTerms', schema }, 'collectFields').catch(() => {});
  }
};
