'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    // Copiar dados de user_id para memberId onde existir membro correspondente
    await queryInterface.sequelize.query(`
      UPDATE ${schema}.aposentados_mia a
      SET "memberId" = m.id
      FROM ${schema}."Members" m
      WHERE a.user_id = m."userId"
      AND a."memberId" IS NULL;
    `);
    
    console.log('✅ Dados de user_id migrados para memberId com sucesso');
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    // Limpar memberId
    await queryInterface.sequelize.query(`
      UPDATE ${schema}.aposentados_mia
      SET "memberId" = NULL;
    `);
  }
};
