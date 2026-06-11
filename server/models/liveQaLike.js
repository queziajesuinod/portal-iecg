const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class LiveQaLike extends Model {
    static associate(models) {
      LiveQaLike.belongsTo(models.LiveQaQuestion, { foreignKey: 'questionId', as: 'question' });
    }
  }

  LiveQaLike.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    questionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'LiveQaQuestions', key: 'id' },
    },
    voterToken: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'Identificador anônimo do visitante que curtiu',
    },
  }, {
    sequelize,
    modelName: 'LiveQaLike',
    tableName: 'LiveQaLikes',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return LiveQaLike;
};
