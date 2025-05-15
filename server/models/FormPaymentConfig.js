module.exports = (sequelize, DataTypes) => {
  const FormPaymentConfig = sequelize.define('FormPaymentConfig', {
    FormId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'forms',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    totalAmount: { type: DataTypes.FLOAT, allowNull: false },
    minEntry: { type: DataTypes.FLOAT, allowNull: false },
    dueDate: { type: DataTypes.DATE, allowNull: false },
    gateway: { type: DataTypes.STRING, allowNull: false },
    returnUrl: { type: DataTypes.STRING, allowNull: true }
  }, {
    tableName: 'form_payment_configs',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  FormPaymentConfig.associate = models => {
    FormPaymentConfig.belongsTo(models.Form, { foreignKey: 'FormId', as: 'Form' });
  };

  return FormPaymentConfig;
};
