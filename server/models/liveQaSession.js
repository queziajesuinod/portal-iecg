const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class LiveQaSession extends Model {
    static associate(models) {
      LiveQaSession.hasMany(models.LiveQaQuestion, { foreignKey: 'sessionId', as: 'questions' });
    }
  }

  LiveQaSession.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    code: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true,
      comment: 'Código curto para o público entrar na sala',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'open',
      comment: 'open | closed',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    liveTheme: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Aparência da tela ao vivo: cores, fundo, imagem',
    },
  }, {
    sequelize,
    modelName: 'LiveQaSession',
    tableName: 'LiveQaSessions',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return LiveQaSession;
};
