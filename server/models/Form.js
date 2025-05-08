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
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE
  }, {
    tableName: 'forms'
  });

  Form.associate = models => {
    Form.belongsTo(models.FormType);
    Form.hasMany(models.FormField);
    Form.hasMany(models.FormSubmission);
  };

  return Form;
};