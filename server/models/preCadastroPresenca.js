const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PreCadastroPresenca extends Model {
    static associate(models) {
      if (models.Celula) {
        PreCadastroPresenca.belongsTo(models.Celula, { foreignKey: 'celulaId', as: 'celula' });
      }
      if (models.Member) {
        PreCadastroPresenca.belongsTo(models.Member, { foreignKey: 'promovidoEmMembroId', as: 'membroPromovido' });
      }
      if (models.CelulaPresenca) {
        PreCadastroPresenca.hasMany(models.CelulaPresenca, { foreignKey: 'preCadastroId', as: 'presencas' });
      }
    }
  }

  PreCadastroPresenca.init(
    {
      id: {
        type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4
      },
      celulaId: { type: DataTypes.UUID, allowNull: false },
      nome: { type: DataTypes.STRING(255), allowNull: false },
      telefone: { type: DataTypes.STRING(20), allowNull: true },
      whatsapp: { type: DataTypes.STRING(20), allowNull: true },
      tipo: {
        type: DataTypes.ENUM('visitante', 'frequentador', 'novo_integrante'),
        allowNull: false,
        defaultValue: 'visitante'
      },
      apeloId: { type: DataTypes.UUID, allowNull: true },
      promovidoEmMembroId: { type: DataTypes.UUID, allowNull: true },
      promovidoEm: { type: DataTypes.DATE, allowNull: true }
    },
    {
      sequelize,
      modelName: 'PreCadastroPresenca',
      tableName: 'PreCadastroPresencas',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    }
  );

  return PreCadastroPresenca;
};
