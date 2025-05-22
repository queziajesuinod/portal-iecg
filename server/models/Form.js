// Form.js
module.exports = (sequelize, DataTypes) => {
  const Form = sequelize.define('Form', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
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
    endDate: DataTypes.DATE,
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'forms',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
  });

  Form.associate = models => {
    Form.belongsTo(models.FormType, { foreignKey: 'formTypeId', as: 'formType' });
    Form.hasMany(models.FormField, { foreignKey: 'FormId', as: 'FormFields' });
    Form.hasMany(models.FormSubmission, { foreignKey: 'FormId', as: 'FormSubmissions' });
    Form.hasOne(models.FormPaymentConfig, { foreignKey: 'FormId', as: 'FormPaymentConfig' });
  };

  return Form;
};
