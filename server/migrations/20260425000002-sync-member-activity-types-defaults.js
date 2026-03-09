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
  up: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    for (let index = 0; index < SYSTEM_DEFAULT_ACTIVITY_TYPES.length; index += 1) {
      const item = SYSTEM_DEFAULT_ACTIVITY_TYPES[index];
      const sortOrder = (index + 1) * 10;
      await queryInterface.sequelize.query(`
        INSERT INTO ${schema}."MemberActivityTypes" (
          "code",
          "name",
          "description",
          "category",
          "defaultPoints",
          "isSystem",
          "isActive",
          "sortOrder",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          :code,
          :name,
          NULL,
          :category,
          :defaultPoints,
          true,
          true,
          :sortOrder,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("code")
        DO UPDATE SET
          "name" = EXCLUDED."name",
          "category" = EXCLUDED."category",
          "defaultPoints" = EXCLUDED."defaultPoints",
          "isSystem" = true,
          "isActive" = true,
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = CURRENT_TIMESTAMP
      `, {
        replacements: {
          code: item.code,
          name: item.name,
          category: item.category,
          defaultPoints: item.defaultPoints,
          sortOrder
        }
      });
    }

    const allowedCodes = SYSTEM_DEFAULT_ACTIVITY_TYPES.map((item) => `'${item.code}'`).join(', ');
    await queryInterface.sequelize.query(`
      DELETE FROM ${schema}."MemberActivityTypes"
      WHERE "isSystem" = true
        AND "code" NOT IN (${allowedCodes})
    `);
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    const codes = SYSTEM_DEFAULT_ACTIVITY_TYPES.map((item) => `'${item.code}'`).join(', ');
    await queryInterface.sequelize.query(`
      UPDATE ${schema}."MemberActivityTypes"
      SET "isActive" = false,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "code" IN (${codes})
    `);
  }
};
