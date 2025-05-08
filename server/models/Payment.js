module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define('Payment', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      amount: DataTypes.FLOAT,
      status: DataTypes.STRING,
      gateway: DataTypes.STRING,
      transactionId: DataTypes.STRING,
      metadata: DataTypes.JSON,
      payerName: DataTypes.STRING,
      payerEmail: DataTypes.STRING,
      payerPhone: DataTypes.STRING,
      returnUrl: DataTypes.STRING,
      checkoutUrl: DataTypes.STRING
    }, {
        tableName: 'payments'
      });
  
    Payment.associate = models => {
      Payment.belongsTo(models.FormSubmission);
      Payment.hasMany(models.PaymentHistory);
    };
  
    return Payment;
  };
  