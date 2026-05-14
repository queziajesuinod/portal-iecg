module.exports = {
  up: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        tbl   text := '"${schema}"."CelulaMembroVinculos"';
        ntype text := '"${schema}"."enum_CelulaMembroVinculos_papel"';
        otype text := '"${schema}"."enum_CelulaMembroVinculos_papel_old"';
        col_type text;
      BEGIN
        -- Descobre o tipo atual da coluna papel
        SELECT udt_schema || '.' || udt_name
          INTO col_type
          FROM information_schema.columns
         WHERE table_schema = '${schema}'
           AND table_name   = 'CelulaMembroVinculos'
           AND column_name  = 'papel';

        -- Remove DEFAULT para não bloquear nenhuma alteração de tipo
        EXECUTE 'ALTER TABLE ' || tbl || ' ALTER COLUMN papel DROP DEFAULT';

        -- Se o novo tipo ainda não existe, cria-o
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = '${schema}' AND t.typname = 'enum_CelulaMembroVinculos_papel'
            AND t.typtype = 'e'
            AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = t.oid AND enumlabel = 'anfitria')
        ) THEN
          -- Precisa criar o novo tipo (renomeia o atual para _old primeiro, se ainda não foi)
          IF NOT EXISTS (
            SELECT 1 FROM pg_type t2
            JOIN pg_namespace n2 ON n2.oid = t2.typnamespace
            WHERE n2.nspname = '${schema}' AND t2.typname = 'enum_CelulaMembroVinculos_papel_old'
          ) THEN
            EXECUTE 'ALTER TYPE ' || ntype || ' RENAME TO "enum_CelulaMembroVinculos_papel_old"';
          END IF;
          EXECUTE 'CREATE TYPE ' || ntype || ' AS ENUM (''membro'', ''lider'', ''auxiliar'', ''anfitria'')';
        END IF;

        -- Migra valores co_lider para auxiliar antes de converter a coluna
        EXECUTE 'UPDATE ' || tbl || ' SET papel = ''auxiliar'' WHERE papel::text = ''co_lider''';

        -- Converte a coluna para o novo tipo
        EXECUTE 'ALTER TABLE ' || tbl
          || ' ALTER COLUMN papel TYPE ' || ntype
          || ' USING papel::text::' || ntype;

        -- Restaura o DEFAULT
        EXECUTE 'ALTER TABLE ' || tbl || ' ALTER COLUMN papel SET DEFAULT ''membro''::' || ntype;

        -- Descarta o tipo antigo se ainda existir
        IF EXISTS (
          SELECT 1 FROM pg_type t3
          JOIN pg_namespace n3 ON n3.oid = t3.typnamespace
          WHERE n3.nspname = '${schema}' AND t3.typname = 'enum_CelulaMembroVinculos_papel_old'
        ) THEN
          EXECUTE 'DROP TYPE ' || otype;
        END IF;
      END
      $$;
    `);
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        tbl   text := '"${schema}"."CelulaMembroVinculos"';
        ntype text := '"${schema}"."enum_CelulaMembroVinculos_papel"';
        otype text := '"${schema}"."enum_CelulaMembroVinculos_papel_old"';
      BEGIN
        EXECUTE 'ALTER TABLE ' || tbl || ' ALTER COLUMN papel DROP DEFAULT';

        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = '${schema}' AND t.typname = 'enum_CelulaMembroVinculos_papel_old'
        ) THEN
          EXECUTE 'ALTER TYPE ' || ntype || ' RENAME TO "enum_CelulaMembroVinculos_papel_old"';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = '${schema}' AND t.typname = 'enum_CelulaMembroVinculos_papel'
            AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = t.oid AND enumlabel = 'co_lider')
        ) THEN
          EXECUTE 'CREATE TYPE ' || ntype || ' AS ENUM (''membro'', ''lider'', ''co_lider'', ''auxiliar'')';
        END IF;

        EXECUTE 'UPDATE ' || tbl || ' SET papel = ''auxiliar'' WHERE papel::text = ''anfitria''';

        EXECUTE 'ALTER TABLE ' || tbl
          || ' ALTER COLUMN papel TYPE ' || ntype
          || ' USING papel::text::' || ntype;

        EXECUTE 'ALTER TABLE ' || tbl || ' ALTER COLUMN papel SET DEFAULT ''membro''::' || ntype;

        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = '${schema}' AND t.typname = 'enum_CelulaMembroVinculos_papel_old'
        ) THEN
          EXECUTE 'DROP TYPE ' || otype;
        END IF;
      END
      $$;
    `);
  }
};
