'use strict';

module.exports = {
  up: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const now = new Date();

    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM "${schema}"."MemberActivityTypes" WHERE code = 'FIM_VOLUNTARIADO' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert({ tableName: 'MemberActivityTypes', schema }, [{
        id: require('crypto').randomUUID(),
        code: 'FIM_VOLUNTARIADO',
        name: 'Encerramento de voluntariado',
        description: 'Registrado automaticamente ao encerrar um vínculo de voluntariado',
        category: 'VOLUNTARIADO',
        defaultPoints: 0,
        isSystem: true,
        isActive: true,
        sortOrder: 999,
        createdAt: now,
        updatedAt: now
      }]);
    }
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.bulkDelete(
      { tableName: 'MemberActivityTypes', schema },
      { code: 'FIM_VOLUNTARIADO' }
    );
  }
};
