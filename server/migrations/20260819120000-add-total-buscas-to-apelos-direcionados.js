const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'total_buscas',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      }
    );

    // Backfill: quantas vezes cada pessoa já procurou o Start = 1 (cadastro inicial)
    // + nº de históricos "Procurou novamente o start" registrados até agora.
    await queryInterface.sequelize.query(`
      UPDATE "${SCHEMA}"."apelos_direcionados_celulas" ac
      SET "total_buscas" = 1 + COALESCE(sub.qtd, 0)
      FROM (
        SELECT "apelo_id", COUNT(*) AS qtd
        FROM "${SCHEMA}"."apelos_direcionados_historico"
        WHERE "tipo_evento" = 'STATUS'
          AND "motivo" ILIKE '%Procurou novamente o start%'
        GROUP BY "apelo_id"
      ) sub
      WHERE ac."id" = sub."apelo_id";
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'apelos_direcionados_celulas' },
      'total_buscas'
    );
  }
};
