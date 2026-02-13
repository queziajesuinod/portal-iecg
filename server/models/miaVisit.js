'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MIAVisit extends Model {
    static associate(models) {
      // Relacionamento com MIA
      if (models.MIA) {
        MIAVisit.belongsTo(models.MIA, { 
          foreignKey: 'miaId', 
          as: 'mia' 
        });
      }
      
      // Visitante
      if (models.User) {
        MIAVisit.belongsTo(models.User, { 
          foreignKey: 'visitorId', 
          as: 'visitor' 
        });
      }
    }
    
    // Métodos de instância
    isRecent() {
      const daysSince = Math.floor((new Date() - new Date(this.visitDate)) / (1000 * 60 * 60 * 24));
      return daysSince <= 30;
    }
    
    getDurationFormatted() {
      if (!this.duration) return 'Não informado';
      const hours = Math.floor(this.duration / 60);
      const minutes = this.duration % 60;
      if (hours > 0) {
        return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
      }
      return `${minutes}min`;
    }
  }

  MIAVisit.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    miaId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    
    visitDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    visitType: {
      type: DataTypes.ENUM('PRESENCIAL', 'TELEFONE', 'VIDEO_CHAMADA'),
      allowNull: false
    },
    
    // Quem fez a visita
    visitorId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    visitorName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    // Detalhes da visita
    duration: {
      type: DataTypes.INTEGER, // em minutos
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    prayerRequests: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Próxima visita
    nextVisitScheduled: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'MIAVisit',
    tableName: 'MIAVisits',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
    updatedAt: false // Visitas não são atualizadas
  });

  return MIAVisit;
};
