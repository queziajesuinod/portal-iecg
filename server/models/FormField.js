module.exports = (sequelize, DataTypes) => {
    const FormField = sequelize.define('FormField', {
      label: DataTypes.STRING,
      type: DataTypes.STRING,
      required: { type: DataTypes.BOOLEAN, defaultValue: false },
      options: DataTypes.JSON
    }, {
        tableName: 'form_fields '
      });
  
    FormField.associate = models => {
      FormField.belongsTo(models.Form);
    };
  
    return FormField;
  };
  