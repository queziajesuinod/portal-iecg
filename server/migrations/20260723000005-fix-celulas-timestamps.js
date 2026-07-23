// Corrige os timestamps da tabela `celulas`:
//  - normaliza createdAt/updatedAt para timestamptz (data + hora), lidando com colunas
//    que foram criadas como `time` (só hora, sem data) ou `date`;
//  - preenche createdAt a partir de updatedAt onde estava ausente/"só data";
//  - define DEFAULT now() para que novas células gravem a data/hora de criação corretas.
module.exports = {
  async up(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = `"${schema}"."celulas"`;
    const q = (sql) => queryInterface.sequelize.query(sql);

    // Normaliza uma coluna para timestamptz. Se o tipo atual não puder ser convertido
    // (ex.: `time` só com hora), descarta os valores (USING NULL) — serão preenchidos depois.
    const normalizeCol = (col) => `
      DO $$
      DECLARE dt text;
      BEGIN
        SELECT data_type INTO dt FROM information_schema.columns
          WHERE table_schema = '${schema}' AND table_name = 'celulas' AND column_name = '${col}';
        IF dt IS NULL THEN
          ALTER TABLE ${table} ADD COLUMN "${col}" timestamptz;
        ELSIF dt = 'timestamp with time zone' THEN
          NULL; -- já está correto
        ELSIF dt = 'timestamp without time zone' THEN
          ALTER TABLE ${table} ALTER COLUMN "${col}" TYPE timestamptz USING "${col}" AT TIME ZONE 'UTC';
        ELSIF dt = 'date' THEN
          ALTER TABLE ${table} ALTER COLUMN "${col}" TYPE timestamptz USING "${col}"::timestamptz;
        ELSE
          -- tipos inúteis para data (ex.: time): descarta o conteúdo
          ALTER TABLE ${table} ALTER COLUMN "${col}" TYPE timestamptz USING NULL::timestamptz;
        END IF;
      END $$;`;

    await q(normalizeCol('createdAt'));
    await q(normalizeCol('updatedAt'));

    // Preenche createdAt com o updatedAt onde está nulo ou "só data" (sem hora = meia-noite).
    await q(`
      UPDATE ${table}
      SET "createdAt" = "updatedAt"
      WHERE "updatedAt" IS NOT NULL
        AND ("createdAt" IS NULL OR "createdAt" = date_trunc('day', "createdAt"));
    `);

    // Se ainda houver nulos (updatedAt também inválido), usa agora.
    await q(`
      UPDATE ${table}
      SET "createdAt" = COALESCE("createdAt", now()),
          "updatedAt" = COALESCE("updatedAt", now())
      WHERE "createdAt" IS NULL OR "updatedAt" IS NULL;
    `);

    // Default + NOT NULL para próximas criações/atualizações.
    await q(`ALTER TABLE ${table} ALTER COLUMN "createdAt" SET DEFAULT now();`);
    await q(`ALTER TABLE ${table} ALTER COLUMN "updatedAt" SET DEFAULT now();`);
    await q(`ALTER TABLE ${table} ALTER COLUMN "createdAt" SET NOT NULL;`);
    await q(`ALTER TABLE ${table} ALTER COLUMN "updatedAt" SET NOT NULL;`);
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const table = `"${schema}"."celulas"`;
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`ALTER TABLE ${table} ALTER COLUMN "createdAt" DROP NOT NULL;`);
    await q(`ALTER TABLE ${table} ALTER COLUMN "updatedAt" DROP NOT NULL;`);
    await q(`ALTER TABLE ${table} ALTER COLUMN "createdAt" DROP DEFAULT;`);
    await q(`ALTER TABLE ${table} ALTER COLUMN "updatedAt" DROP DEFAULT;`);
  },
};
