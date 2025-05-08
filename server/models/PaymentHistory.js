module.exports = (sequelize, DataTypes) => {
  const PaymentHistory = sequelize.define('PaymentHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    paymentId: {
      type: DataTypes.UUID,
      references: { model: 'Payments', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    status: DataTypes.STRING,
    timestamp: DataTypes.DATE,
    notes: DataTypes.TEXT
  }, {
    tableName: 'payment_histories'
  });
  PaymentHistory.associate = models => {
    PaymentHistory.belongsTo(models.Payment);
  };
  return PaymentHistory;
};