const { Model, DataTypes } = require('sequelize');
const { normalizeCpf } = require('../utils/cpf');
const { syncUserFromMemberRecord } = require('../utils/memberUserSync');

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

      if (models.CelulaMembroVinculo) {
        Member.hasMany(models.CelulaMembroVinculo, {
          foreignKey: 'membroId',
          as: 'celulaVinculos'
        });
      }

      if (models.MemberCargo) {
        Member.hasMany(models.MemberCargo, {
          foreignKey: 'membroId',
          as: 'cargos'
        });
      }

      if (models.Campus && models.CampusPastorResponsavel) {
        Member.belongsToMany(models.Campus, {
          through: models.CampusPastorResponsavel,
          foreignKey: 'memberId',
          otherKey: 'campusId',
          as: 'campiResponsavel'
        });
      }

      // Auto-relacionamento para cônjuge
      Member.belongsTo(Member, {
        foreignKey: 'spouseMemberId',
        as: 'spouse'
      });

      // Hierarquia eclesiastica (pode apontar para si mesmo se o membro for o proprio pastor)
      Member.belongsTo(Member, {
        foreignKey: 'liderancaApostolicaMemberId',
        as: 'liderancaApostolica'
      });
      Member.belongsTo(Member, {
        foreignKey: 'pastorGeracaoMemberId',
        as: 'pastorGeracao'
      });
      Member.belongsTo(Member, {
        foreignKey: 'pastorCampusMemberId',
        as: 'pastorCampus'
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
        age -= 1;
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
      type: DataTypes.STRING(11),
      unique: true,
      allowNull: true,
      validate: {
        is: /^\d{11}$/
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
    liderancaApostolicaMemberId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    pastorGeracaoMemberId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    pastorCampusMemberId: {
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

  Member.addHook('afterSave', async (member, options = {}) => {
    if (options.skipLinkedUserSync) {
      return;
    }

    await syncUserFromMemberRecord(member, {
      transaction: options.transaction,
      models: sequelize.models
    });
  });

  // Cascata: ao atualizar a hierarquia do membro, reflete nas celulas onde ele e lider.
  // Roda sempre que pelo menos um dos 3 campos de hierarquia mudou.
  Member.addHook('afterSave', async (member, options = {}) => {
    if (options.skipCelulaHierarquiaSync) return;

    const hierarchyFields = ['liderancaApostolicaMemberId', 'pastorGeracaoMemberId', 'pastorCampusMemberId'];
    const changed = member.changed() || [];
    if (!hierarchyFields.some((f) => changed.includes(f))) return;

    // Require local pra evitar ciclo de import (util usa models, que carrega este arquivo)
    // eslint-disable-next-line global-require
    const { syncCelulasHierarquiaForLeader } = require('../utils/celulaHierarquiaSync');

    try {
      await syncCelulasHierarquiaForLeader(member, {
        transaction: options.transaction,
        models: sequelize.models,
        force: true // hierarquia do lider e a fonte da verdade — sobrescreve a celula
      });
    } catch (err) {
      // Nao quebra o save do membro se a cascata falhar
      // eslint-disable-next-line no-console
      console.error('[celulaHierarquiaSync] Erro ao cascatear hierarquia:', err.message);
    }
  });

  Member.addHook('beforeValidate', (member) => {
    if (!member) return;
    member.setDataValue('cpf', normalizeCpf(member.cpf));
  });

  return Member;
};
