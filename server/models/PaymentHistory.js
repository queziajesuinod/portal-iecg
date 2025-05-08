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
  },  {
    sequelize,
    modelName: 'PaymentHistory',
    tableName: 'paymentpayment_historiess',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });
  PaymentHistory.associate = models => {
    PaymentHistory.belongsTo(models.Payment);
  };
  return PaymentHistory;
};