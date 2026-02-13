'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    // Adicionar novos campos à tabela aposentados_mia
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'memberId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Members', schema },
          key: 'id'
        },
        onDelete: 'CASCADE'
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'miaDate',
      {
        type: Sequelize.DATEONLY,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_DATE')
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'reason',
      {
        type: Sequelize.ENUM('IDADE_AVANCADA', 'SAUDE', 'MUDANCA_CIDADE', 'AFASTAMENTO_VOLUNTARIO', 'OUTRO'),
        allowNull: true,
        defaultValue: 'IDADE_AVANCADA'
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'reasonDetails',
      {
        type: Sequelize.TEXT,
        allowNull: true
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'emergencyContact',
      {
        type: Sequelize.STRING(255),
        allowNull: true
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'emergencyPhone',
      {
        type: Sequelize.STRING(20),
        allowNull: true
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'lastVisitDate',
      {
        type: Sequelize.DATEONLY,
        allowNull: true
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'nextVisitDate',
      {
        type: Sequelize.DATEONLY,
        allowNull: true
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'visitFrequency',
      {
        type: Sequelize.ENUM('SEMANAL', 'QUINZENAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL'),
        allowNull: true
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'responsiblePastorId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Users', schema },
          key: 'id'
        }
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'responsibleLeaderId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Users', schema },
          key: 'id'
        }
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'healthNotes',
      {
        type: Sequelize.TEXT,
        allowNull: true
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'specialNeeds',
      {
        type: Sequelize.TEXT,
        allowNull: true
      }
    );
    
    await queryInterface.addColumn(
      { tableName: 'aposentados_mia', schema },
      'createdBy',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Users', schema },
          key: 'id'
        }
      }
    );
    
    // Criar índices
    await queryInterface.addIndex({ tableName: 'aposentados_mia', schema }, ['memberId'], {
      name: 'idx_aposentados_mia_member'
    });
    
    await queryInterface.addIndex({ tableName: 'aposentados_mia', schema }, ['nextVisitDate'], {
      name: 'idx_aposentados_mia_next_visit'
    });
    
    await queryInterface.addIndex({ tableName: 'aposentados_mia', schema }, ['responsiblePastorId'], {
      name: 'idx_aposentados_mia_pastor'
    });
    
    await queryInterface.addIndex({ tableName: 'aposentados_mia', schema }, ['responsibleLeaderId'], {
      name: 'idx_aposentados_mia_leader'
    });
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'memberId');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'miaDate');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'reason');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'reasonDetails');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'emergencyContact');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'emergencyPhone');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'lastVisitDate');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'nextVisitDate');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'visitFrequency');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'responsiblePastorId');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'responsibleLeaderId');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'healthNotes');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'specialNeeds');
    await queryInterface.removeColumn({ tableName: 'aposentados_mia', schema }, 'createdBy');
  }
};
