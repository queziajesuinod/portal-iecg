'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MemberJourney extends Model {
    static associate(models) {
      // Relacionamento 1:1 com Member
      if (models.Member) {
        MemberJourney.belongsTo(models.Member, { 
          foreignKey: 'memberId', 
          as: 'member' 
        });
      }
    }
    
    // Métodos de instância
    isHealthy() {
      return this.healthStatus === 'SAUDAVEL';
    }
    
    needsAttention() {
      return this.healthStatus === 'ATENCAO' || this.healthStatus === 'CRITICO';
    }
    
    isHighlyEngaged() {
      return this.engagementScore >= 70;
    }
    
    isAtRisk() {
      return this.daysInactive > 30 || this.engagementScore < 30;
    }
    
    getEngagementLevel() {
      if (this.engagementScore >= 80) return 'EXCELENTE';
      if (this.engagementScore >= 60) return 'BOM';
      if (this.engagementScore >= 40) return 'REGULAR';
      if (this.engagementScore >= 20) return 'BAIXO';
      return 'CRITICO';
    }
  }

  MemberJourney.init({
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
    
    // Estágio atual na jornada
    currentStage: {
      type: DataTypes.ENUM(
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
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    
    // Métricas de engajamento
    engagementScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    
    lastActivityDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    daysInactive: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Status de saúde espiritual
    healthStatus: {
      type: DataTypes.ENUM('SAUDAVEL', 'ATENCAO', 'CRITICO', 'MIA'),
      defaultValue: 'SAUDAVEL'
    },
    
    // Próximos passos sugeridos pela IA (JSON)
    suggestedNextSteps: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    
    lastAiAnalysisDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Alertas para a liderança (JSON)
    alerts: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    
    // Interesses e dons (JSON)
    interests: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    
    spiritualGifts: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'MemberJourney',
    tableName: 'MemberJourney',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true
  });

  return MemberJourney;
};
