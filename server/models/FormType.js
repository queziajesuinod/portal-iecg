module.exports = (sequelize, DataTypes) => {
    const FormType = sequelize.define('FormType', {
      name: DataTypes.STRING,
      description: DataTypes.TEXT
    }, {
        tableName: 'form_types'
      });
    FormType.associate = models => {
      FormType.hasMany(models.Form);
    };
    return FormType;
  };
  