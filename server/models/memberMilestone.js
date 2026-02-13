'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MemberMilestone extends Model {
    static associate(models) {
      // Relacionamento com Member
      if (models.Member) {
        MemberMilestone.belongsTo(models.Member, { 
          foreignKey: 'memberId', 
          as: 'member' 
        });
      }
      
      // Criado por
      if (models.User) {
        MemberMilestone.belongsTo(models.User, { 
          foreignKey: 'createdBy', 
          as: 'creator' 
        });
      }
    }
    
    // Métodos de instância
    getMilestoneCategory() {
      const categories = {
        PRIMEIRA_VISITA: 'INICIO',
        DECISAO_FE: 'SALVACAO',
        BATISMO: 'SALVACAO',
        MEMBRO_OFICIAL: 'COMPROMISSO',
        PRIMEIRA_CELULA: 'COMUNIDADE',
        LIDER_CELULA: 'LIDERANCA',
        VOLUNTARIO_MINISTERIO: 'SERVICO',
        LIDER_MINISTERIO: 'LIDERANCA',
        CURSO_CONCLUIDO: 'DISCIPULADO',
        DIZIMISTA_FIEL: 'GENEROSIDADE',
        CASAMENTO: 'FAMILIA',
        DEDICACAO_FILHO: 'FAMILIA',
        ANIVERSARIO_CONVERSAO: 'CELEBRACAO'
      };
      return categories[this.milestoneType] || 'OUTRO';
    }
    
    getYearsSince() {
      const today = new Date();
      const achievedDate = new Date(this.achievedDate);
      return today.getFullYear() - achievedDate.getFullYear();
    }
  }

  MemberMilestone.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    
    milestoneType: {
      type: DataTypes.ENUM(
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
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Certificado ou comprovante
    certificateUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    
    // Controle
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'MemberMilestone',
    tableName: 'MemberMilestones',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
    updatedAt: false // Milestones não são atualizados
  });

  return MemberMilestone;
};
