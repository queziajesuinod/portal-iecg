const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class LiveQaQuestion extends Model {
    static associate(models) {
      LiveQaQuestion.belongsTo(models.LiveQaSession, { foreignKey: 'sessionId', as: 'session' });
      LiveQaQuestion.hasMany(models.LiveQaLike, { foreignKey: 'questionId', as: 'likes' });
    }
  }

  LiveQaQuestion.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'LiveQaSessions', key: 'id' },
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    authorName: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    authorToken: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Identificador anônimo do visitante (localStorage)',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      comment: 'active | archived',
    },
    isLive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    answered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    likesCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'LiveQaQuestion',
    tableName: 'LiveQaQuestions',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return LiveQaQuestion;
};
