'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    await queryInterface.createTable('MemberActivities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      memberId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'Members', schema },
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      
      activityType: {
        type: Sequelize.ENUM(
          'CULTO_PRESENCA',
          'CELULA_PRESENCA',
          'EVENTO_INSCRICAO',
          'EVENTO_PRESENCA',
          'CURSO_INICIO',
          'CURSO_CONCLUSAO',
          'DOACAO',
          'DIZIMO',
          'VOLUNTARIADO',
          'PEDIDO_ORACAO',
          'TESTEMUNHO',
          'BATISMO',
          'CEIA',
          'MINISTERIO_INGRESSO',
          'LIDERANCA_INICIO'
        ),
        allowNull: false
      },
      
      activityDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      
      // Pontos para gamificação
      points: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      
      // Dados específicos da atividade (JSON)
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      
      // Referências opcionais
      eventId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Events', schema },
          key: 'id'
        }
      },
      celulaId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'celulas', schema },
          key: 'id'
        }
      },
      courseId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      
      // Controle
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { schema });
    
    // Criar índices
    await queryInterface.addIndex({ tableName: 'MemberActivities', schema }, ['memberId'], {
      name: 'idx_activities_member'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberActivities', schema }, ['activityType'], {
      name: 'idx_activities_type'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberActivities', schema }, ['activityDate'], {
      name: 'idx_activities_date'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberActivities', schema }, ['memberId', 'activityDate'], {
      name: 'idx_activities_member_date'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberActivities', schema }, ['eventId'], {
      name: 'idx_activities_event'
    });
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'MemberActivities', schema });
  }
};
