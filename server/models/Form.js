// models/Form.js
module.exports = (sequelize, DataTypes) => {
  const Form = sequelize.define('Form', {
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    slug: {
      type: DataTypes.STRING,
      unique: true
    },
    allowMultiplePayments: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    hasPayment: DataTypes.BOOLEAN,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE
  }, {
    tableName: 'forms',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  Form.associate = models => {
    Form.belongsTo(models.FormType, { foreignKey: 'formTypeId', as: 'formType' });
    Form.hasMany(models.FormField, { foreignKey: 'FormId', as: 'fields' });
    Form.hasMany(models.FormSubmission, { foreignKey: 'FormId', as: 'submissions' });
    Form.hasOne(models.FormPaymentConfig, { foreignKey: 'formId', as: 'paymentConfig' });
  };

  return Form;
};
