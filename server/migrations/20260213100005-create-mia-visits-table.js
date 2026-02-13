'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    await queryInterface.createTable('MIAVisits', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      miaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'MIA', schema },
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      
      visitDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      visitType: {
        type: Sequelize.ENUM('PRESENCIAL', 'TELEFONE', 'VIDEO_CHAMADA'),
        allowNull: false
      },
      
      // Quem fez a visita
      visitorId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Users', schema },
          key: 'id'
        }
      },
      visitorName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      
      // Detalhes da visita
      duration: {
        type: Sequelize.INTEGER, // em minutos
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      prayerRequests: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Próxima visita
      nextVisitScheduled: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { schema });
    
    // Criar índices
    await queryInterface.addIndex({ tableName: 'MIAVisits', schema }, ['miaId'], {
      name: 'idx_mia_visits_mia'
    });
    
    await queryInterface.addIndex({ tableName: 'MIAVisits', schema }, ['visitDate'], {
      name: 'idx_mia_visits_date'
    });
    
    await queryInterface.addIndex({ tableName: 'MIAVisits', schema }, ['visitorId'], {
      name: 'idx_mia_visits_visitor'
    });
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'MIAVisits', schema });
  }
};
