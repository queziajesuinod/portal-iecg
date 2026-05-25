const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Celula extends Model {
    static associate(models) {
      if (models.Campus) {
        Celula.belongsTo(models.Campus, { foreignKey: 'campusId', as: 'campusRef' });
      }
      if (models.User) {
        Celula.belongsTo(models.User, { foreignKey: 'liderId', as: 'liderRef' });
      }
      if (models.Member) {
        Celula.belongsTo(models.Member, { foreignKey: 'liderMemberId', as: 'liderMemberRef' });
        Celula.belongsTo(models.Member, { foreignKey: 'liderancaMemberId', as: 'liderancaMemberRef' });
        Celula.belongsTo(models.Member, { foreignKey: 'pastorGeracaoMemberId', as: 'pastorGeracaoMemberRef' });
        Celula.belongsTo(models.Member, { foreignKey: 'pastorCampusMemberId', as: 'pastorCampusMemberRef' });
      }
      if (models.CelulaMembroVinculo) {
        Celula.hasMany(models.CelulaMembroVinculo, { foreignKey: 'celulaId', as: 'membrosVinculo' });
      }
      if (models.CelulaReuniao) {
        Celula.hasMany(models.CelulaReuniao, { foreignKey: 'celulaId', as: 'reunioes' });
      }
    }
  }

  Celula.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    celula: {
      type: DataTypes.STRING,
      allowNull: false
    },
    rede: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lider: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email_lider: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cel_lider: {
      type: DataTypes.STRING,
      allowNull: true
    },
    anfitriao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    campus: {
      type: DataTypes.STRING,
      allowNull: true
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: true
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cep: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bairro: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cidade: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lideranca: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pastor_geracao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pastor_campus: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dia: {
      type: DataTypes.STRING,
      allowNull: true
    },
    horario: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lat: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    lon: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    campusId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    liderId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    liderMemberId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    liderancaMemberId: {
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
    }
  }, {
    sequelize,
    modelName: 'Celula',
    tableName: 'celulas',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  // Cascata reversa: ao salvar a celula, se algum dos campos de hierarquia
  // mudou e o cadastro do lider esta com aquele campo vazio, preenche no membro.
  // Nao sobrescreve nada que ja tenha valor no membro.
  Celula.addHook('afterSave', async (celula, options = {}) => {
    if (options.skipMemberHierarquiaSync) return;
    if (!celula.liderMemberId) return;

    const triggerFields = ['liderMemberId', 'liderancaMemberId', 'pastorGeracaoMemberId', 'pastorCampusMemberId'];
    const changed = celula.changed() || [];
    if (!triggerFields.some((f) => changed.includes(f))) return;

    // eslint-disable-next-line global-require
    const { backfillLeaderHierarchyFromCelula } = require('../utils/celulaHierarquiaSync');

    try {
      await backfillLeaderHierarchyFromCelula(celula, {
        transaction: options.transaction,
        models: sequelize.models
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[celulaHierarquiaSync] Erro ao preencher hierarquia no líder:', err.message);
    }
  });

  return Celula;
};
