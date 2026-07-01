require('dotenv').config();
const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Adiciona dia da semana à turma (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab)
    await queryInterface.addColumn(
      { tableName: 'CfmTurmas', schema: SCHEMA },
      'diaSemana',
      {
        type: Sequelize.SMALLINT,
        allowNull: true,
        comment: '0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab',
      }
    );

    // Aulas (sessões com data específica — lista de presença)
    await queryInterface.createTable(
      { tableName: 'CfmAulas', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
        },
        turmaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmTurmas' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        dataAula: { type: Sequelize.DATEONLY, allowNull: false },
        titulo: { type: Sequelize.STRING(120), allowNull: true },
        observacoes: { type: Sequelize.TEXT, allowNull: true },
        geradaAutomaticamente: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addConstraint(
      { tableName: 'CfmAulas', schema: SCHEMA },
      { fields: ['turmaId', 'dataAula'], type: 'unique', name: 'uq_cfm_aulas_turma_data' }
    );
    await queryInterface.addIndex(
      { tableName: 'CfmAulas', schema: SCHEMA },
      ['turmaId', 'dataAula'],
      { name: 'idx_cfm_aulas_turma_data' }
    );

    // Presenças por aula (quem estava em sala)
    await queryInterface.createTable(
      { tableName: 'CfmAulaPresencas', schema: SCHEMA },
      {
        id: {
          type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
        },
        aulaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmAulas' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        inscricaoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmInscricoes' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        presente: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        observacao: { type: Sequelize.STRING(255), allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addConstraint(
      { tableName: 'CfmAulaPresencas', schema: SCHEMA },
      { fields: ['aulaId', 'inscricaoId'], type: 'unique', name: 'uq_cfm_aula_presencas_aula_inscricao' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'CfmAulaPresencas', schema: SCHEMA });
    await queryInterface.dropTable({ tableName: 'CfmAulas', schema: SCHEMA });
    await queryInterface.removeColumn({ tableName: 'CfmTurmas', schema: SCHEMA }, 'diaSemana');
  },
};
