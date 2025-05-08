// migrations/20250507120600-convert-payments-id-to-uuid.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Renomeia a coluna antiga temporariamente
    await queryInterface.renameColumn({ tableName: 'payments', schema: 'dev_iecg' }, 'id', 'old_id');

    // Adiciona nova coluna UUID
    await queryInterface.addColumn(
      { tableName: 'payments', schema: 'dev_iecg' },
      'id',
      {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
        primaryKey: true
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn({ tableName: 'payments', schema: 'dev_iecg' }, 'id');
    await queryInterface.renameColumn({ tableName: 'payments', schema: 'dev_iecg' }, 'old_id', 'id');
  }
};
