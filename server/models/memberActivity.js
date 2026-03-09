'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MemberActivity extends Model {
    static associate(models) {
      // Relacionamento com Member
      if (models.Member) {
        MemberActivity.belongsTo(models.Member, { 
          foreignKey: 'memberId', 
          as: 'member' 
        });
      }
      
      // Relacionamento opcional com Event
      if (models.Event) {
        MemberActivity.belongsTo(models.Event, { 
          foreignKey: 'eventId', 
          as: 'event' 
        });
      }
      
      // Relacionamento opcional com Celula
      if (models.Celula) {
        MemberActivity.belongsTo(models.Celula, { 
          foreignKey: 'celulaId', 
          as: 'celula' 
        });
      }

      // Relacionamento logico com tipo cadastrado (via code)
      if (models.MemberActivityType) {
        MemberActivity.belongsTo(models.MemberActivityType, {
          foreignKey: 'activityType',
          targetKey: 'code',
          as: 'activityTypeRef'
        });
      }
    }
    
    // Métodos de instância
    isRecent() {
      const daysSince = Math.floor((new Date() - new Date(this.activityDate)) / (1000 * 60 * 60 * 24));
      return daysSince <= 7;
    }
    
    getActivityCategory() {
      const categories = {
        CULTO_PRESENCA: 'ADORACAO',
        CELULA_PRESENCA: 'COMUNIDADE',
        EVENTO_INSCRICAO: 'EVENTOS',
        EVENTO_PRESENCA: 'EVENTOS',
        CURSO_INICIO: 'DISCIPULADO',
        CURSO_CONCLUSAO: 'DISCIPULADO',
        DOACAO: 'GENEROSIDADE',
        DIZIMO: 'GENEROSIDADE',
        VOLUNTARIADO: 'SERVICO',
        PEDIDO_ORACAO: 'ORACAO',
        TESTEMUNHO: 'TESTEMUNHO',
        BATISMO: 'MARCOS',
        CEIA: 'ADORACAO',
        MINISTERIO_INGRESSO: 'SERVICO',
        LIDERANCA_INICIO: 'LIDERANCA'
      };
      return categories[this.activityType] || 'OUTRO';
    }
  }

  MemberActivity.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    
    activityType: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    
    activityDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    
    // Pontos para gamificação
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Dados específicos da atividade (JSON)
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    
    // Referências opcionais
    eventId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    celulaId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'MemberActivity',
    tableName: 'MemberActivities',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
    updatedAt: false // Atividades não são atualizadas
  });

  return MemberActivity;
};
