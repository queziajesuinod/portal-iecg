'use strict';

const LEGACY_ACTIVITY_ENUM = [
  'CULTO_PRESENCA',
  'CELULA_PRESENCA',
  'EVENTO_INSCRICAO',
  'EVENTO_PRESENCA',
  'CURSO_INICIO',
  'CURSO_CONCLUSAO',
  'DOACAO',
  'DIZIMO',
  'VOLUNTARIADO',
  'PEDIDO_ORACAO',
  'TESTEMUNHO',
  'BATISMO',
  'CEIA',
  'MINISTERIO_INGRESSO',
  'LIDERANCA_INICIO'
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.changeColumn(
      { tableName: 'MemberActivities', schema },
      'activityType',
      {
        type: Sequelize.STRING(80),
        allowNull: false
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    const [rows] = await queryInterface.sequelize.query(`
      SELECT DISTINCT "activityType"
      FROM ${schema}."MemberActivities"
      WHERE "activityType" IS NOT NULL
    `);

    const invalid = rows
      .map((row) => row.activityType)
      .filter((value) => !LEGACY_ACTIVITY_ENUM.includes(value));

    if (invalid.length) {
      throw new Error(`Nao e possivel reverter: activityType(s) fora do ENUM legado: ${invalid.join(', ')}`);
    }

    await queryInterface.changeColumn(
      { tableName: 'MemberActivities', schema },
      'activityType',
      {
        type: Sequelize.ENUM(...LEGACY_ACTIVITY_ENUM),
        allowNull: false
      }
    );
  }
};
