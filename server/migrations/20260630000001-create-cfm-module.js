require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ===== Escolas =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'CfmEscolas' },
      {
        id: {
          type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
        },
        nome: { type: Sequelize.STRING(120), allowNull: false },
        descricao: { type: Sequelize.TEXT, allowNull: true },
        temModulos: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );

    // ===== Módulos =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'CfmModulos' },
      {
        id: {
          type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
        },
        escolaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmEscolas' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        nome: { type: Sequelize.STRING(120), allowNull: false },
        descricao: { type: Sequelize.TEXT, allowNull: true },
        ordem: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'CfmModulos' },
      ['escolaId', 'ordem'],
      { name: 'idx_cfm_modulos_escola_ordem' }
    );

    // ===== Matérias =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'CfmMaterias' },
      {
        id: {
          type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
        },
        escolaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmEscolas' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        moduloId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { schema: SCHEMA, tableName: 'CfmModulos' }, key: 'id' },
          onDelete: 'SET NULL',
        },
        nome: { type: Sequelize.STRING(120), allowNull: false },
        descricao: { type: Sequelize.TEXT, allowNull: true },
        ordem: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'CfmMaterias' },
      ['escolaId', 'moduloId'],
      { name: 'idx_cfm_materias_escola_modulo' }
    );

    // ===== Turmas =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'CfmTurmas' },
      {
        id: {
          type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
        },
        escolaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmEscolas' }, key: 'id' },
        },
        moduloId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { schema: SCHEMA, tableName: 'CfmModulos' }, key: 'id' },
          onDelete: 'SET NULL',
        },
        numeracao: { type: Sequelize.STRING(30), allowNull: false },
        campusId: { type: Sequelize.UUID, allowNull: true },
        periodoInicio: { type: Sequelize.DATEONLY, allowNull: false },
        periodoFim: { type: Sequelize.DATEONLY, allowNull: false },
        vagasMax: { type: Sequelize.INTEGER, allowNull: true },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'ABERTA',
          comment: 'ABERTA | EM_ANDAMENTO | ENCERRADA | CANCELADA',
        },
        activityTypeCode: { type: Sequelize.STRING(80), allowNull: true, comment: 'Tipo de atividade gerado ao confirmar pagamento da matrícula' },
        marcoConclussaoCode: { type: Sequelize.STRING(80), allowNull: true, comment: 'Tipo de atividade (marco) gerado ao aprovar o aluno' },
        observacoes: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'CfmTurmas' },
      ['escolaId', 'status'],
      { name: 'idx_cfm_turmas_escola_status' }
    );

    // ===== Turma-Matérias (matéria dentro de uma turma com mestre e período próprio) =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'CfmTurmaMaterias' },
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
        materiaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmMaterias' }, key: 'id' },
        },
        mestreId: { type: Sequelize.UUID, allowNull: true, comment: 'FK Members — professor desta matéria na turma' },
        periodoInicio: { type: Sequelize.DATEONLY, allowNull: true },
        periodoFim: { type: Sequelize.DATEONLY, allowNull: true },
        ordem: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'CfmTurmaMaterias' },
      { fields: ['turmaId', 'materiaId'], type: 'unique', name: 'uq_cfm_turma_materias_turma_materia' }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'CfmTurmaMaterias' },
      ['turmaId'],
      { name: 'idx_cfm_turma_materias_turma' }
    );

    // ===== Inscrições =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'CfmInscricoes' },
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
        memberId: { type: Sequelize.UUID, allowNull: true, comment: 'FK Members — null se não for membro' },
        nomeNaoMembro: { type: Sequelize.STRING(120), allowNull: true, comment: 'Nome quando não é membro cadastrado' },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'PENDENTE',
          comment: 'PENDENTE | LISTA_ESPERA | ATIVO | CONCLUIDO | REPROVADO | DESISTENTE | CANCELADO',
        },
        pagamentoMatricula: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        dataPagamento: { type: Sequelize.DATEONLY, allowNull: true },
        valorMatricula: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        aprovado: { type: Sequelize.BOOLEAN, allowNull: true },
        motivoReprovacao: { type: Sequelize.TEXT, allowNull: true },
        memberActivityId: { type: Sequelize.UUID, allowNull: true, comment: 'MemberActivity criada na confirmação de pagamento' },
        marcoActivityId: { type: Sequelize.UUID, allowNull: true, comment: 'MemberActivity (marco) criada na aprovação' },
        observacoes: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'CfmInscricoes' },
      ['turmaId', 'status'],
      { name: 'idx_cfm_inscricoes_turma_status' }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'CfmInscricoes' },
      ['memberId'],
      { name: 'idx_cfm_inscricoes_membro' }
    );

    // ===== Notas =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'CfmNotas' },
      {
        id: {
          type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
        },
        inscricaoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmInscricoes' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        turmaMateriaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmTurmaMaterias' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        nota: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
        aprovado: { type: Sequelize.BOOLEAN, allowNull: true },
        observacao: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'CfmNotas' },
      { fields: ['inscricaoId', 'turmaMateriaId'], type: 'unique', name: 'uq_cfm_notas_inscricao_materia' }
    );

    // ===== Presenças =====
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'CfmPresencas' },
      {
        id: {
          type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4
        },
        inscricaoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmInscricoes' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        turmaMateriaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'CfmTurmaMaterias' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        data: { type: Sequelize.DATEONLY, allowNull: false },
        presente: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        observacao: { type: Sequelize.STRING(255), allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      }
    );
    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'CfmPresencas' },
      { fields: ['inscricaoId', 'turmaMateriaId', 'data'], type: 'unique', name: 'uq_cfm_presencas_inscricao_materia_data' }
    );
    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'CfmPresencas' },
      ['turmaMateriaId', 'data'],
      { name: 'idx_cfm_presencas_materia_data' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'CfmPresencas' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'CfmNotas' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'CfmInscricoes' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'CfmTurmaMaterias' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'CfmTurmas' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'CfmMaterias' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'CfmModulos' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'CfmEscolas' });
  },
};
