require('dotenv').config();
const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove constraint/index antigo (era por turma+data apenas)
    await queryInterface.removeConstraint(
      { tableName: 'CfmAulas', schema: SCHEMA },
      'uq_cfm_aulas_turma_data'
    );
    await queryInterface.removeIndex(
      { tableName: 'CfmAulas', schema: SCHEMA },
      'idx_cfm_aulas_turma_data'
    );

    // Adiciona FK para matéria da turma
    await queryInterface.addColumn(
      { tableName: 'CfmAulas', schema: SCHEMA },
      'turmaMateriaId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { schema: SCHEMA, tableName: 'CfmTurmaMaterias' }, key: 'id' },
        onDelete: 'SET NULL',
      }
    );

    // Unique parcial: (turmaId, turmaMateriaId, dataAula) quando turmaMateriaId não é null
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "uq_cfm_aulas_turma_materia_data"
      ON "${SCHEMA}"."CfmAulas" ("turmaId", "turmaMateriaId", "dataAula")
      WHERE "turmaMateriaId" IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "${SCHEMA}"."uq_cfm_aulas_turma_materia_data";
    `);
    await queryInterface.removeColumn({ tableName: 'CfmAulas', schema: SCHEMA }, 'turmaMateriaId');
    await queryInterface.addConstraint(
      { tableName: 'CfmAulas', schema: SCHEMA },
      { fields: ['turmaId', 'dataAula'], type: 'unique', name: 'uq_cfm_aulas_turma_data' }
    );
  },
};
