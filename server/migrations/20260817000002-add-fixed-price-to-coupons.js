const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Adicionar o valor 'fixed_price' ao ENUM discountType.
    // ATENCAO: ADD VALUE nao pode rodar dentro de transacao no Postgres, por isso
    // usamos query crua sem transaction. IF NOT EXISTS torna a migration idempotente.
    await queryInterface.sequelize.query(
      `ALTER TYPE "${schema}"."enum_Coupons_discountType" ADD VALUE IF NOT EXISTS 'fixed_price';`
    );

    // 2. Campo com os precos finais por setor (ex: {"FRENTE":220,"INTERMEDIARIO":160,"GALERIA":140}).
    // Para eventos sem setores, usar a chave "DEFAULT".
    await queryInterface.addColumn(
      { tableName: 'Coupons', schema },
      'sectorPrices',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Precos finais por setor para discountType=fixed_price. Ex: {"FRENTE":220,"GALERIA":140}. Chave "DEFAULT" para eventos sem setor'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ tableName: 'Coupons', schema }, 'sectorPrices');
    // Nota: Postgres nao suporta remover um valor de ENUM. 'fixed_price' permanece no tipo.
  }
};
