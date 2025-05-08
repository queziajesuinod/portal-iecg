module.exports = (sequelize, DataTypes) => {
    const FormSubmission = sequelize.define('FormSubmission', {
      data: DataTypes.JSON
    }, {
      sequelize,
      modelName: 'FormSubmission',
      tableName: 'form_submissions',
      schema: process.env.DB_SCHEMA || 'dev_iecg'
    });
  
    FormSubmission.associate = models => {
      FormSubmission.belongsTo(models.Form);
      FormSubmission.hasOne(models.Payment);
    };
  
    return FormSubmission;
  };
  