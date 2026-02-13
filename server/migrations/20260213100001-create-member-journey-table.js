'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    await queryInterface.createTable('MemberJourney', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      memberId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: { tableName: 'Members', schema },
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      
      // Estágio atual na jornada
      currentStage: {
        type: Sequelize.ENUM(
          'VISITANTE',
          'FREQUENTADOR',
          'CONGREGADO',
          'MEMBRO',
          'DISCIPULO',
          'LIDER_EM_FORMACAO',
          'LIDER_ATIVO',
          'MULTIPLICADOR',
          'MIA'
        ),
        defaultValue: 'VISITANTE'
      },
      
      stageChangedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      
      // Métricas de engajamento
      engagementScore: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100
        }
      },
      
      lastActivityDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      daysInactive: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      
      // Status de saúde espiritual
      healthStatus: {
        type: Sequelize.ENUM('SAUDAVEL', 'ATENCAO', 'CRITICO', 'MIA'),
        defaultValue: 'SAUDAVEL'
      },
      
      // Próximos passos sugeridos pela IA (JSON)
      suggestedNextSteps: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      
      lastAiAnalysisDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Alertas para a liderança (JSON)
      alerts: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      
      // Interesses e dons (JSON)
      interests: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      
      spiritualGifts: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      
      // Controle
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { schema });
    
    // Criar índices
    await queryInterface.addIndex({ tableName: 'MemberJourney', schema }, ['memberId'], {
      name: 'idx_journey_member'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberJourney', schema }, ['currentStage'], {
      name: 'idx_journey_stage'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberJourney', schema }, ['healthStatus'], {
      name: 'idx_journey_health'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberJourney', schema }, ['daysInactive'], {
      name: 'idx_journey_inactive'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberJourney', schema }, ['engagementScore'], {
      name: 'idx_journey_engagement'
    });
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'MemberJourney', schema });
  }
};
