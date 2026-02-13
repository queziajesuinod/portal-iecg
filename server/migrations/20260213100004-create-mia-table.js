'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    await queryInterface.createTable('MIA', {
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
      
      // Data de entrada no MIA
      miaDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE')
      },
      
      // Motivo da inatividade
      reason: {
        type: Sequelize.ENUM(
          'IDADE_AVANCADA',
          'SAUDE',
          'MUDANCA_CIDADE',
          'AFASTAMENTO_VOLUNTARIO',
          'OUTRO'
        ),
        allowNull: false
      },
      
      reasonDetails: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Dados de contato especiais para MIA
      emergencyContact: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      emergencyPhone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      
      // Acompanhamento
      lastVisitDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      nextVisitDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      visitFrequency: {
        type: Sequelize.ENUM('SEMANAL', 'QUINZENAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL'),
        allowNull: true
      },
      
      // Responsável pelo acompanhamento
      responsiblePastorId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Users', schema },
          key: 'id'
        }
      },
      responsibleLeaderId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Users', schema },
          key: 'id'
        }
      },
      
      // Observações específicas
      healthNotes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      specialNeeds: {
        type: Sequelize.TEXT,
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
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { schema });
    
    // Criar índices
    await queryInterface.addIndex({ tableName: 'MIA', schema }, ['memberId'], {
      name: 'idx_mia_member'
    });
    
    await queryInterface.addIndex({ tableName: 'MIA', schema }, ['nextVisitDate'], {
      name: 'idx_mia_next_visit'
    });
    
    await queryInterface.addIndex({ tableName: 'MIA', schema }, ['responsiblePastorId'], {
      name: 'idx_mia_responsible_pastor'
    });
    
    await queryInterface.addIndex({ tableName: 'MIA', schema }, ['responsibleLeaderId'], {
      name: 'idx_mia_responsible_leader'
    });
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'MIA', schema });
  }
};
