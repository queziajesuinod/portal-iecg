'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    console.log('💑 Iniciando atualização de relacionamentos de cônjuges...');
    
    // Buscar todos os Users que têm cônjuge
    const [usersWithSpouse] = await queryInterface.sequelize.query(`
      SELECT u.id as user_id, u.conjuge_id, u.name
      FROM ${schema}."Users" u
      WHERE u.conjuge_id IS NOT NULL
    `);
    
    console.log(`📊 Encontrados ${usersWithSpouse.length} relacionamentos de cônjuges para atualizar`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithSpouse) {
      try {
        // Buscar o Member correspondente ao User
        const [members] = await queryInterface.sequelize.query(`
          SELECT id FROM ${schema}."Members"
          WHERE "userId" = :userId
          LIMIT 1
        `, {
          replacements: { userId: user.user_id },
          type: Sequelize.QueryTypes.SELECT
        });
        
        if (!members || members.length === 0) {
          console.warn(`⚠️  Member não encontrado para User ${user.user_id} (${user.name})`);
          errorCount++;
          continue;
        }
        
        const memberId = members[0].id;
        
        // Buscar o Member correspondente ao cônjuge
        const [spouseMembers] = await queryInterface.sequelize.query(`
          SELECT id FROM ${schema}."Members"
          WHERE "userId" = :spouseUserId
          LIMIT 1
        `, {
          replacements: { spouseUserId: user.conjuge_id },
          type: Sequelize.QueryTypes.SELECT
        });
        
        if (!spouseMembers || spouseMembers.length === 0) {
          console.warn(`⚠️  Member cônjuge não encontrado para User ${user.conjuge_id}`);
          errorCount++;
          continue;
        }
        
        const spouseMemberId = spouseMembers[0].id;
        
        // Atualizar spouseMemberId no Member
        await queryInterface.sequelize.query(`
          UPDATE ${schema}."Members"
          SET "spouseMemberId" = :spouseMemberId
          WHERE id = :memberId
        `, {
          replacements: {
            memberId: memberId,
            spouseMemberId: spouseMemberId
          },
          type: Sequelize.QueryTypes.UPDATE
        });
        
        updatedCount++;
        
        if (updatedCount % 50 === 0) {
          console.log(`✅ Atualizados ${updatedCount}/${usersWithSpouse.length} relacionamentos...`);
        }
      } catch (error) {
        console.error(`❌ Erro ao atualizar relacionamento do usuário ${user.user_id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`✅ Atualização concluída: ${updatedCount} relacionamentos atualizados, ${errorCount} erros`);
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    console.log('🔄 Revertendo relacionamentos de cônjuges...');
    
    // Limpar todos os spouseMemberId
    await queryInterface.sequelize.query(`
      UPDATE ${schema}."Members"
      SET "spouseMemberId" = NULL
      WHERE "spouseMemberId" IS NOT NULL
    `);
    
    console.log('✅ Relacionamentos revertidos com sucesso');
  }
};
