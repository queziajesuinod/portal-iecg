'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MIA extends Model {
    static associate(models) {
      // Relacionamento 1:1 com Member
      if (models.Member) {
        MIA.belongsTo(models.Member, { 
          foreignKey: 'memberId', 
          as: 'member' 
        });
      }
      
      // Responsável pastor
      if (models.User) {
        MIA.belongsTo(models.User, { 
          foreignKey: 'responsiblePastorId', 
          as: 'responsiblePastor' 
        });
      }
      
      // Responsável líder
      if (models.User) {
        MIA.belongsTo(models.User, { 
          foreignKey: 'responsibleLeaderId', 
          as: 'responsibleLeader' 
        });
      }
      
      // Criado por
      if (models.User) {
        MIA.belongsTo(models.User, { 
          foreignKey: 'createdBy', 
          as: 'creator' 
        });
      }
      
      // Relacionamento 1:N com MIAVisits
      if (models.MIAVisit) {
        MIA.hasMany(models.MIAVisit, { 
          foreignKey: 'miaId', 
          as: 'visits' 
        });
      }
    }
    
    // Métodos de instância
    needsVisit() {
      if (!this.nextVisitDate) return true;
      const today = new Date();
      const nextVisit = new Date(this.nextVisitDate);
      return today >= nextVisit;
    }
    
    isOverdue() {
      if (!this.nextVisitDate) return false;
      const today = new Date();
      const nextVisit = new Date(this.nextVisitDate);
      const daysSince = Math.floor((today - nextVisit) / (1000 * 60 * 60 * 24));
      return daysSince > 7; // Mais de 7 dias atrasado
    }
    
    getDaysSinceLastVisit() {
      if (!this.lastVisitDate) return null;
      const today = new Date();
      const lastVisit = new Date(this.lastVisitDate);
      return Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
    }
    
    getTimeInMIA() {
      const today = new Date();
      const miaDate = new Date(this.miaDate);
      const months = (today.getFullYear() - miaDate.getFullYear()) * 12 + 
                     (today.getMonth() - miaDate.getMonth());
      return months;
    }
  }

  MIA.init({
    // Campos existentes da tabela aposentados_mia
    filhos: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    indicacao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    patologia: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    plano_saude: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    hospital: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    remedios: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    habilidades: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    analfabeto: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    tipo_pessoa: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Campos novos adicionados pela migration
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    
    // Data de entrada no MIA
    miaDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    
    // Motivo da inatividade
    reason: {
      type: DataTypes.ENUM(
        'IDADE_AVANCADA',
        'SAUDE',
        'MUDANCA_CIDADE',
        'AFASTAMENTO_VOLUNTARIO',
        'OUTRO'
      ),
      allowNull: false
    },
    
    reasonDetails: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Dados de contato especiais para MIA
    emergencyContact: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    emergencyPhone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    
    // Acompanhamento
    lastVisitDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    nextVisitDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    visitFrequency: {
      type: DataTypes.ENUM('SEMANAL', 'QUINZENAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL'),
      allowNull: true
    },
    
    // Responsável pelo acompanhamento
    responsiblePastorId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    responsibleLeaderId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    
    // Observações específicas
    healthNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    specialNeeds: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Controle
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'MIA',
    tableName: 'aposentados_mia',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return MIA;
};
