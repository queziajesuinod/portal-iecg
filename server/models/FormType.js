module.exports = (sequelize, DataTypes) => {
  const FormType = sequelize.define('FormType', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'FormType',
    tableName: 'form_types',
    schema: process.env.DB_SCHEMA || 'dev_iecg'
  });

  FormType.associate = (models) => {
    FormType.hasMany(models.Form, { foreignKey: 'formTypeId', as: 'forms' });
  };

  return FormType;
};
