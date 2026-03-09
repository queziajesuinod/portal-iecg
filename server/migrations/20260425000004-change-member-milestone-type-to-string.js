const LEGACY_MILESTONE_ENUM = [
  'PRIMEIRA_VISITA',
  'DECISAO_FE',
  'BATISMO',
  'MEMBRO_OFICIAL',
  'PRIMEIRA_CELULA',
  'LIDER_CELULA',
  'VOLUNTARIO_MINISTERIO',
  'LIDER_MINISTERIO',
  'CURSO_CONCLUIDO',
  'DIZIMISTA_FIEL',
  'CASAMENTO',
  'DEDICACAO_FILHO',
  'ANIVERSARIO_CONVERSAO'
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.changeColumn(
      { tableName: 'MemberMilestones', schema },
      'milestoneType',
      {
        type: Sequelize.STRING(80),
        allowNull: false
      }
    );

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS ${schema}."enum_MemberMilestones_milestoneType";
    `);
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    const [rows] = await queryInterface.sequelize.query(`
      SELECT DISTINCT "milestoneType"
      FROM ${schema}."MemberMilestones"
      WHERE "milestoneType" IS NOT NULL
    `);

    const invalid = rows
      .map((row) => row.milestoneType)
      .filter((value) => !LEGACY_MILESTONE_ENUM.includes(value));

    if (invalid.length) {
      throw new Error(`Nao e possivel reverter: milestoneType(s) fora do ENUM legado: ${invalid.join(', ')}`);
    }

    await queryInterface.changeColumn(
      { tableName: 'MemberMilestones', schema },
      'milestoneType',
      {
        type: Sequelize.ENUM(...LEGACY_MILESTONE_ENUM),
        allowNull: false
      }
    );
  }
};
