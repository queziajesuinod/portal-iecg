require('dotenv').config();
const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { tableName: 'CfmMensalidades', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID, defaultValue: Sequelize.fn('gen_random_uuid'), primaryKey: true, allowNull: false
        },
        inscricaoId: {
          type: Sequelize.UUID, allowNull: false, references: { model: { tableName: 'CfmInscricoes', schema: SCHEMA }, key: 'id' }, onDelete: 'CASCADE'
        },
        competencia: { type: Sequelize.DATEONLY, allowNull: false, comment: 'Primeiro dia do mês — ex: 2026-03-01' },
        vencimento: { type: Sequelize.DATEONLY, allowNull: true },
        pago: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        dataPagamento: { type: Sequelize.DATEONLY, allowNull: true },
        valor: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        observacao: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addConstraint(
      { tableName: 'CfmMensalidades', schema: SCHEMA },
      { fields: ['inscricaoId', 'competencia'], type: 'unique', name: 'uq_cfm_mensalidade_inscricao_competencia' }
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'CfmMensalidades', schema: SCHEMA });
  },
};
