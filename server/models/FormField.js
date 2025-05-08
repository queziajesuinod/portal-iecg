module.exports = (sequelize, DataTypes) => {
  const FormField = sequelize.define('FormField', {
    label: DataTypes.STRING,
    type: DataTypes.STRING,
    required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    options: DataTypes.JSON
  }, {
    tableName: 'form_fields',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  FormField.associate = models => {
    FormField.belongsTo(models.Form, {
      foreignKey: 'FormId',
      as: 'form'
    });
  };

  return FormField;
};
