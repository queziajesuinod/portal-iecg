'use strict';

/**
 * A coluna dev_iecg."Users"."estado_civil" estava vinculada ao tipo
 * public.enum_Users_estado_civil (valores em minúsculo: solteiro, casado, etc.)
 * em vez de dev_iecg.enum_Users_estado_civil (valores corretos: Solteiro, Casado, etc.).
 * Esta migration:
 *  1. Converte a coluna para TEXT
 *  2. Normaliza os dados existentes para os valores capitalizados
 *  3. Reconverte a coluna para o enum correto (dev_iecg)
 */
module.exports = {
  up: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    // 1. Converte a coluna para TEXT para poder manipular os dados
    await queryInterface.sequelize.query(`
      ALTER TABLE ${schema}."Users"
      ALTER COLUMN "estado_civil" TYPE TEXT
      USING "estado_civil"::TEXT
    `);

    // 2. Normaliza valores existentes (minúsculo -> capitalizado)
    await queryInterface.sequelize.query(`
      UPDATE ${schema}."Users"
      SET "estado_civil" = CASE "estado_civil"
        WHEN 'solteiro'      THEN 'Solteiro'
        WHEN 'casado'        THEN 'Casado'
        WHEN 'viuvo'         THEN 'Viúvo'
        WHEN 'divorciado'    THEN 'Divorciado'
        WHEN 'uniao_estavel' THEN 'Casado'
        ELSE NULL
      END
      WHERE "estado_civil" IS NOT NULL
    `);

    // 3. Reconverte a coluna para o enum correto do schema dev_iecg
    await queryInterface.sequelize.query(`
      ALTER TABLE ${schema}."Users"
      ALTER COLUMN "estado_civil" TYPE ${schema}."enum_Users_estado_civil"
      USING "estado_civil"::${schema}."enum_Users_estado_civil"
    `);
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.sequelize.query(`
      ALTER TABLE ${schema}."Users"
      ALTER COLUMN "estado_civil" TYPE TEXT
      USING "estado_civil"::TEXT
    `);

    await queryInterface.sequelize.query(`
      UPDATE ${schema}."Users"
      SET "estado_civil" = LOWER("estado_civil")
      WHERE "estado_civil" IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE ${schema}."Users"
      ALTER COLUMN "estado_civil" TYPE public."enum_Users_estado_civil"
      USING "estado_civil"::public."enum_Users_estado_civil"
    `);
  }
};
