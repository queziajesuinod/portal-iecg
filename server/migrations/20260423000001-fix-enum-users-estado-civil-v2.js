'use strict';

/**
 * Corrige o enum enum_Users_estado_civil no schema correto.
 * A migration anterior (20260324000001) verificava a existência do valor sem
 * filtrar por schema, podendo ignorar valores ausentes no schema dev_iecg
 * quando eles existiam em outro schema (ex: public).
 */
module.exports = {
  up: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const enumName = 'enum_Users_estado_civil';
    const values = ['Solteiro', 'Casado', 'Viúvo', 'Divorciado'];

    for (const value of values) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1
         FROM pg_enum e
         JOIN pg_type t ON e.enumtypid = t.oid
         JOIN pg_namespace n ON t.typnamespace = n.oid
         WHERE t.typname = :enumName
           AND n.nspname = :schema
           AND e.enumlabel = :value`,
        { replacements: { enumName, schema, value } }
      );

      if (rows.length === 0) {
        // ALTER TYPE ... ADD VALUE não pode rodar dentro de uma transação em
        // versões antigas do PostgreSQL, por isso usamos transaction: null.
        await queryInterface.sequelize.query(
          `ALTER TYPE ${schema}."${enumName}" ADD VALUE '${value.replace(/'/g, "''")}'`,
          { transaction: null }
        );
      }
    }
  },

  down: async () => {
    // PostgreSQL não permite remover valores de ENUM
  }
};
