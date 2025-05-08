module.exports = (sequelize, DataTypes) => {
    const FormSubmission = sequelize.define('FormSubmission', {
      data: DataTypes.JSON
    }, {
        tableName: 'form_submissions'
      });
  
    FormSubmission.associate = models => {
      FormSubmission.belongsTo(models.Form);
      FormSubmission.hasOne(models.Payment);
    };
  
    return FormSubmission;
  };
  