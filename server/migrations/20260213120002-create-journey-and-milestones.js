'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    console.log('🎯 Iniciando criação de MemberJourney e Milestones...');
    
    // Buscar todos os Members migrados
    const [members] = await queryInterface.sequelize.query(`
      SELECT m.id, m."userId", m.status, m."baptismDate", m."createdAt"
      FROM ${schema}."Members" m
      WHERE m."userId" IS NOT NULL
      ORDER BY m."createdAt" ASC
    `);
    
    console.log(`📊 Encontrados ${members.length} membros para processar`);
    
    let journeyCount = 0;
    let milestoneCount = 0;
    
    for (const member of members) {
      try {
        // Buscar dados do User original para calcular engagementScore
        const [users] = await queryInterface.sequelize.query(`
          SELECT batizado, frequenta_celula, is_lider_celula
          FROM ${schema}."Users"
          WHERE id = :userId
          LIMIT 1
        `, {
          replacements: { userId: member.userId },
          type: Sequelize.QueryTypes.SELECT
        });
        
        const user = users && users.length > 0 ? users[0] : null;
        
        // Calcular engagement score inicial
        let engagementScore = 20; // Base
        if (user) {
          if (user.batizado) engagementScore += 30;
          if (user.frequenta_celula) engagementScore += 30;
          if (user.is_lider_celula) engagementScore += 20;
        }
        
        // Mapear status para estágio
        const stageMapping = {
          'VISITANTE': 'VISITANTE',
          'CONGREGADO': 'CONGREGADO',
          'MEMBRO': 'MEMBRO',
          'INATIVO': 'VISITANTE',
          'MIA': 'MIA'
        };
        const currentStage = stageMapping[member.status] || 'VISITANTE';
        
        // Determinar healthStatus baseado no status
        const healthStatus = member.status === 'MIA' ? 'MIA' : 
                            member.status === 'INATIVO' ? 'CRITICO' : 'SAUDAVEL';
        
        // Criar MemberJourney
        await queryInterface.sequelize.query(`
          INSERT INTO ${schema}."MemberJourney" (
            id,
            "memberId",
            "currentStage",
            "stageChangedAt",
            "engagementScore",
            "lastActivityDate",
            "daysInactive",
            "healthStatus",
            "suggestedNextSteps",
            "alerts",
            "interests",
            "spiritualGifts",
            "createdAt",
            "updatedAt"
          ) VALUES (
            gen_random_uuid(),
            :memberId,
            :currentStage,
            :stageChangedAt,
            :engagementScore,
            :lastActivityDate,
            0,
            :healthStatus,
            '[]'::jsonb,
            '[]'::jsonb,
            '[]'::jsonb,
            '[]'::jsonb,
            :createdAt,
            :updatedAt
          )
        `, {
          replacements: {
            memberId: member.id,
            currentStage: currentStage,
            stageChangedAt: member.createdAt,
            engagementScore: engagementScore,
            lastActivityDate: member.createdAt,
            healthStatus: healthStatus,
            createdAt: member.createdAt,
            updatedAt: new Date()
          },
          type: Sequelize.QueryTypes.INSERT
        });
        
        journeyCount++;
        
        // Criar milestone de PRIMEIRA_VISITA para todos
        await queryInterface.sequelize.query(`
          INSERT INTO ${schema}."MemberMilestones" (
            id,
            "memberId",
            "milestoneType",
            "achievedDate",
            description,
            "createdAt"
          ) VALUES (
            gen_random_uuid(),
            :memberId,
            'PRIMEIRA_VISITA',
            :achievedDate,
            'Primeira visita à igreja',
            :createdAt
          )
        `, {
          replacements: {
            memberId: member.id,
            achievedDate: member.createdAt,
            createdAt: member.createdAt
          },
          type: Sequelize.QueryTypes.INSERT
        });
        
        milestoneCount++;
        
        // Se foi batizado, criar milestone de BATISMO
        if (member.baptismDate && user && user.batizado) {
          await queryInterface.sequelize.query(`
            INSERT INTO ${schema}."MemberMilestones" (
              id,
              "memberId",
              "milestoneType",
              "achievedDate",
              description,
              "createdAt"
            ) VALUES (
              gen_random_uuid(),
              :memberId,
              'BATISMO',
              :achievedDate,
              'Batismo nas águas',
              :createdAt
            )
          `, {
            replacements: {
              memberId: member.id,
              achievedDate: member.baptismDate,
              createdAt: member.baptismDate
            },
            type: Sequelize.QueryTypes.INSERT
          });
          
          milestoneCount++;
        }
        
        // Se é membro oficial, criar milestone
        if (member.status === 'MEMBRO') {
          await queryInterface.sequelize.query(`
            INSERT INTO ${schema}."MemberMilestones" (
              id,
              "memberId",
              "milestoneType",
              "achievedDate",
              description,
              "createdAt"
            ) VALUES (
              gen_random_uuid(),
              :memberId,
              'MEMBRO_OFICIAL',
              :achievedDate,
              'Tornou-se membro oficial da igreja',
              :createdAt
            )
          `, {
            replacements: {
              memberId: member.id,
              achievedDate: member.createdAt,
              createdAt: member.createdAt
            },
            type: Sequelize.QueryTypes.INSERT
          });
          
          milestoneCount++;
        }
        
        // Se é líder de célula, criar milestone
        if (user && user.is_lider_celula) {
          await queryInterface.sequelize.query(`
            INSERT INTO ${schema}."MemberMilestones" (
              id,
              "memberId",
              "milestoneType",
              "achievedDate",
              description,
              "createdAt"
            ) VALUES (
              gen_random_uuid(),
              :memberId,
              'LIDER_CELULA',
              :achievedDate,
              'Tornou-se líder de célula',
              :createdAt
            )
          `, {
            replacements: {
              memberId: member.id,
              achievedDate: member.createdAt,
              createdAt: member.createdAt
            },
            type: Sequelize.QueryTypes.INSERT
          });
          
          milestoneCount++;
        }
        
        if (journeyCount % 100 === 0) {
          console.log(`✅ Processados ${journeyCount}/${members.length} membros...`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar membro ${member.id}:`, error.message);
      }
    }
    
    console.log(`✅ Criação concluída: ${journeyCount} jornadas e ${milestoneCount} marcos criados`);
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    console.log('🔄 Revertendo jornadas e marcos...');
    
    // Deletar todos os MemberJourney e MemberMilestones
    await queryInterface.sequelize.query(`
      DELETE FROM ${schema}."MemberMilestones"
      WHERE "memberId" IN (
        SELECT id FROM ${schema}."Members" WHERE "userId" IS NOT NULL
      )
    `);
    
    await queryInterface.sequelize.query(`
      DELETE FROM ${schema}."MemberJourney"
      WHERE "memberId" IN (
        SELECT id FROM ${schema}."Members" WHERE "userId" IS NOT NULL
      )
    `);
    
    console.log('✅ Jornadas e marcos revertidos com sucesso');
  }
};
