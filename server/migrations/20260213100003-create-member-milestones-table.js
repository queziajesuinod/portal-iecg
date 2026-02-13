'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    await queryInterface.createTable('MemberMilestones', {
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
      
      milestoneType: {
        type: Sequelize.ENUM(
          'PRIMEIRA_VISITA',
          'DECISAO_FE',
          'BATISMO',
          'MEMBRO_OFICIAL',
          'PRIMEIRA_CELULA',
          'LIDER_CELULA',
          'VOLUNTARIO_MINISTERIO',
          'LIDER_MINISTERIO',
          'CURSO_CONCLUIDO',
          'DIZIMISTA_FIEL',
          'CASAMENTO',
          'DEDICACAO_FILHO',
          'ANIVERSARIO_CONVERSAO'
        ),
        allowNull: false
      },
      
      achievedDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Certificado ou comprovante
      certificateUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      
      // Controle
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Users', schema },
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { schema });
    
    // Criar índices
    await queryInterface.addIndex({ tableName: 'MemberMilestones', schema }, ['memberId'], {
      name: 'idx_milestones_member'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberMilestones', schema }, ['milestoneType'], {
      name: 'idx_milestones_type'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberMilestones', schema }, ['achievedDate'], {
      name: 'idx_milestones_date'
    });
    
    await queryInterface.addIndex({ tableName: 'MemberMilestones', schema }, ['memberId', 'achievedDate'], {
      name: 'idx_milestones_member_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'MemberMilestones', schema });
  }
};
