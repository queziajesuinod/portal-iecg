'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Member extends Model {
    static associate(models) {
      // Relacionamento 1:1 com User (opcional)
      if (models.User) {
        Member.belongsTo(models.User, { 
          foreignKey: 'userId', 
          as: 'user' 
        });
      }
      
      // Relacionamento com Campus
      if (models.Campus) {
        Member.belongsTo(models.Campus, { 
          foreignKey: 'campusId', 
          as: 'campus' 
        });
      }
      
      // Relacionamento com Célula
      if (models.Celula) {
        Member.belongsTo(models.Celula, { 
          foreignKey: 'celulaId', 
          as: 'celula' 
        });
        Member.hasMany(models.Celula, {
          foreignKey: 'liderMemberId',
          as: 'liderancaCelulas'
        });
      }
      
      // Auto-relacionamento para cônjuge
      Member.belongsTo(Member, { 
        foreignKey: 'spouseMemberId', 
        as: 'spouse' 
      });
      
      // Relacionamento 1:1 com MemberJourney
      if (models.MemberJourney) {
        Member.hasOne(models.MemberJourney, { 
          foreignKey: 'memberId', 
          as: 'journey' 
        });
      }
      
      // Relacionamento 1:N com MemberActivities
      if (models.MemberActivity) {
        Member.hasMany(models.MemberActivity, { 
          foreignKey: 'memberId', 
          as: 'activities' 
        });
      }
      
      // Relacionamento 1:N com MemberMilestones
      if (models.MemberMilestone) {
        Member.hasMany(models.MemberMilestone, { 
          foreignKey: 'memberId', 
          as: 'milestones' 
        });
      }
      
      // Relacionamento 1:1 com MIA (opcional)
      if (models.MIA) {
        Member.hasOne(models.MIA, { 
          foreignKey: 'memberId', 
          as: 'miaRecord' 
        });
      }
      
      // Criado por
      if (models.User) {
        Member.belongsTo(models.User, { 
          foreignKey: 'createdBy', 
          as: 'creator' 
        });
      }
    }
    
    // Métodos de instância
    getFullName() {
      return this.preferredName || this.fullName;
    }
    
    getAge() {
      if (!this.birthDate) return null;
      const today = new Date();
      const birthDate = new Date(this.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    
    isActive() {
      return ['VISITANTE', 'CONGREGADO', 'MEMBRO'].includes(this.status);
    }
    
    isMIA() {
      return this.status === 'MIA';
    }
  }

  Member.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      unique: true,
      allowNull: true
    },
    
    // Dados Pessoais
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    preferredName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    cpf: {
      type: DataTypes.STRING(14),
      unique: true,
      allowNull: true,
      validate: {
        is: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/
      }
    },
    rg: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('MASCULINO', 'FEMININO', 'OUTRO'),
      allowNull: true
    },
    maritalStatus: {
      type: DataTypes.ENUM('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL'),
      allowNull: true
    },
    
    // Contato
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    whatsapp: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    
    // Endereço
    zipCode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    street: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    complement: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    neighborhood: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(2),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      defaultValue: 'Brasil'
    },
    
    // Dados Eclesiásticos
    membershipDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    baptismDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    baptismPlace: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    conversionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    
    // Status do Membro
    status: {
      type: DataTypes.ENUM('VISITANTE', 'CONGREGADO', 'MEMBRO', 'INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'),
      defaultValue: 'VISITANTE'
    },
    statusChangeDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    statusReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Relacionamentos
    campusId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    celulaId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    spouseMemberId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    
    // Foto
    photoUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Observações
    notes: {
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
    modelName: 'Member',
    tableName: 'Members',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    paranoid: true, // Soft delete
    timestamps: true
  });

  return Member;
};

