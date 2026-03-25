'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_Users_estado_civil'
            AND e.enumlabel = 'Solteiro'
        ) THEN
          ALTER TYPE dev_iecg."enum_Users_estado_civil" ADD VALUE 'Solteiro';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_Users_estado_civil'
            AND e.enumlabel = 'Casado'
        ) THEN
          ALTER TYPE dev_iecg."enum_Users_estado_civil" ADD VALUE 'Casado';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_Users_estado_civil'
            AND e.enumlabel = 'Viúvo'
        ) THEN
          ALTER TYPE dev_iecg."enum_Users_estado_civil" ADD VALUE 'Viúvo';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_Users_estado_civil'
            AND e.enumlabel = 'Divorciado'
        ) THEN
          ALTER TYPE dev_iecg."enum_Users_estado_civil" ADD VALUE 'Divorciado';
        END IF;
      END
      $$;
    `);
  },

  down: async () => {
    // PostgreSQL não permite remover valores de ENUM
  }
};
