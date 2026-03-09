'use strict';

const SYSTEM_DEFAULT_ACTIVITY_TYPES = [
  { code: 'CELULA_PRESENCA', name: 'Presenca em celula', category: 'COMUNIDADE', defaultPoints: 12 },
  { code: 'EVENTO_INSCRICAO', name: 'Inscricao em evento', category: 'EVENTOS', defaultPoints: 5 },
  { code: 'EVENTO_PRESENCA', name: 'Presenca em evento', category: 'EVENTOS', defaultPoints: 15 },
  { code: 'ESCOLA_FUNDAMENTOS_INICIO', name: 'Escola de Fundamentos - Inicio', category: 'DISCIPULADO', defaultPoints: 8 },
  { code: 'ESCOLA_FUNDAMENTOS_CONCLUSAO', name: 'Escola de Fundamentos - Conclusao', category: 'DISCIPULADO', defaultPoints: 20 },
  { code: 'VOLUNTARIADO', name: 'Voluntariado', category: 'SERVICO', defaultPoints: 18 },
  { code: 'BATISMO', name: 'Batismo', category: 'MARCOS', defaultPoints: 30 },
  { code: 'LIDERANCA_AVANCADA1_MOD1_INICIO', name: 'Lideranca Avancada 1 Modulo 1 - Inicio', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA1_MOD2_INICIO', name: 'Lideranca Avancada 1 Modulo 2 - Inicio', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA1_MOD3_INICIO', name: 'Lideranca Avancada 1 Modulo 3 - Inicio', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA1_MOD1_CONCLUSAO', name: 'Lideranca Avancada 1 Modulo 1 - Conclusao', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA1_MOD2_ICONCLUSAO', name: 'Lideranca Avancada 1 Modulo 2 - Conclusao', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA1_MOD3_CONCLUSAO', name: 'Lideranca Avancada 1 Modulo 3 - Conclusao', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA2_MOD1_INICIO', name: 'Lideranca Avancada 2 Modulo 1 - Inicio', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA2_MOD2_INICIO', name: 'Lideranca Avancada 2 Modulo 2 - Inicio', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA2_MOD3_INICIO', name: 'Lideranca Avancada 2 Modulo 3 - Inicio', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA2_MOD1_CONCLUSAO', name: 'Lideranca Avancada 2 Modulo 1 - Conclusao', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA2_MOD2_ICONCLUSAO', name: 'Lideranca Avancada 2 Modulo 2 - Conclusao', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA2_MOD3_CONCLUSAO', name: 'Lideranca Avancada 2 Modulo 3 - Conclusao', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA3_MOD1_INICIO', name: 'Lideranca Avancada 3 Modulo 1 - Inicio', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA3_MOD2_INICIO', name: 'Lideranca Avancada 3 Modulo 2 - Inicio', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA3_MOD3_INICIO', name: 'Lideranca Avancada 3 Modulo 3 - Inicio', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA3_MOD1_CONCLUSAO', name: 'Lideranca Avancada 3 Modulo 1 - Conclusao', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA3_MOD2_ICONCLUSAO', name: 'Lideranca Avancada 3 Modulo 2 - Conclusao', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'LIDERANCA_AVANCADA3_MOD3_CONCLUSAO', name: 'Lideranca Avancada 3 Modulo 3 - Conclusao', category: 'LIDERANCA', defaultPoints: 25 },
  { code: 'APELO', name: 'Apelo', category: null, defaultPoints: 10 },
  { code: 'ENCAMINHAMENTO_CELULA', name: 'Encaminhamento celula', category: null, defaultPoints: 10 },
  { code: 'CONSOLIDADO_CELULA', name: 'Consolidado celula', category: null, defaultPoints: 10 },
  { code: 'ENCONTRO_COM_DEUS', name: 'Encontro com Deus', category: null, defaultPoints: 15 },
  { code: 'CURSO_LIBERTACAO', name: 'Curso de libertacao', category: null, defaultPoints: 15 }
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.createTable('MemberActivityTypes', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      code: {
        type: Sequelize.STRING(80),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(80),
        allowNull: true
      },
      defaultPoints: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isSystem: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { schema });

    await queryInterface.addIndex({ tableName: 'MemberActivityTypes', schema }, ['code'], {
      name: 'idx_member_activity_types_code',
      unique: true
    });

    await queryInterface.addIndex({ tableName: 'MemberActivityTypes', schema }, ['isActive'], {
      name: 'idx_member_activity_types_active'
    });

    await queryInterface.addIndex({ tableName: 'MemberActivityTypes', schema }, ['sortOrder'], {
      name: 'idx_member_activity_types_sort'
    });

    const now = new Date();
    const rows = SYSTEM_DEFAULT_ACTIVITY_TYPES.map((item, index) => ({
      ...item,
      isSystem: true,
      isActive: true,
      sortOrder: (index + 1) * 10,
      createdAt: now,
      updatedAt: now
    }));

    await queryInterface.bulkInsert({ tableName: 'MemberActivityTypes', schema }, rows);
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'MemberActivityTypes', schema });
  }
};
