const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Coupon extends Model {
    static associate(models) {
      Coupon.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
      Coupon.hasMany(models.Registration, { foreignKey: 'couponId', as: 'registrations' });
    }
  }

  Coupon.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true, // null = válido para todos os eventos
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false,
      comment: 'percentage = porcentagem, fixed = valor fixo'
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Se percentage: 0-100, se fixed: valor em reais'
    },
    minimumQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Quantidade mínima de ingressos necessária para ativar o cupom'
    },
    maxUses: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = unlimited
    },
    currentUses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Coupon',
    tableName: 'Coupons',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return Coupon;
};
