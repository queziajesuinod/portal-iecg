'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    await queryInterface.createTable('Members', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        unique: true,
        allowNull: true,
        references: {
          model: { tableName: 'Users', schema },
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      
      // Dados Pessoais
      fullName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      preferredName: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      cpf: {
        type: Sequelize.STRING(14),
        allowNull: true
      },
      rg: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      birthDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('MASCULINO', 'FEMININO', 'OUTRO'),
        allowNull: true
      },
      maritalStatus: {
        type: Sequelize.ENUM('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL'),
        allowNull: true
      },
      
      // Contato
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      whatsapp: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      
      // Endereço
      zipCode: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      street: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      number: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      complement: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      neighborhood: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(2),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        defaultValue: 'Brasil'
      },
      
      // Dados Eclesiásticos
      membershipDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      baptismDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      baptismPlace: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      conversionDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      
      // Status do Membro
      status: {
        type: Sequelize.ENUM('VISITANTE', 'CONGREGADO', 'MEMBRO', 'INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'),
        defaultValue: 'VISITANTE'
      },
      statusChangeDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      statusReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Relacionamentos
      campusId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Campus', schema },
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
      
      // Família
      spouseMemberId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Members', schema },
          key: 'id'
        }
      },
      
      // Foto
      photoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      
      // Observações
      notes: {
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
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    }, { schema });
    
    // Criar índices
    await queryInterface.addIndex({ tableName: 'Members', schema }, ['status'], {
      name: 'idx_members_status'
    });
    
    await queryInterface.addIndex({ tableName: 'Members', schema }, ['campusId'], {
      name: 'idx_members_campus'
    });
    
    await queryInterface.addIndex({ tableName: 'Members', schema }, ['celulaId'], {
      name: 'idx_members_celula'
    });
    
    await queryInterface.addIndex({ tableName: 'Members', schema }, ['userId'], {
      name: 'idx_members_user'
    });
    
    await queryInterface.addIndex({ tableName: 'Members', schema }, ['cpf'], {
      name: 'idx_members_cpf'
    });
    
    await queryInterface.addIndex({ tableName: 'Members', schema }, ['fullName'], {
      name: 'idx_members_fullname'
    });
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'Members', schema });
  }
};
