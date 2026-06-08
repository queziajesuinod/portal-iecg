const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MinistroCampusMinisterio extends Model {
    static associate(models) {
      MinistroCampusMinisterio.belongsTo(models.Ministro, { foreignKey: 'ministroId', as: 'ministro' });
      MinistroCampusMinisterio.belongsTo(models.Campus, { foreignKey: 'campusId', as: 'campus' });
      MinistroCampusMinisterio.belongsTo(models.Ministerio, { foreignKey: 'ministerioId', as: 'ministerio' });
    }
  }

  MinistroCampusMinisterio.init(
    {
      ministroId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      campusId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      ministerioId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    },
    {
      sequelize,
      modelName: 'MinistroCampusMinisterio',
      tableName: 'ministro_campus_ministerio',
      schema: process.env.DB_SCHEMA || 'dev_iecg',
    }
  );

  return MinistroCampusMinisterio;
};
