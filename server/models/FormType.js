module.exports = (sequelize, DataTypes) => {
  const FormType = sequelize.define('FormType', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING
  }, {
    tableName: 'form_types', // <- aqui está o ponto-chave
    timestamps: false // se não houver createdAt/updatedAt
  });

  FormType.associate = (models) => {
    FormType.hasMany(models.Form, { foreignKey: 'formTypeId', as: 'forms' });
  };

  return FormType;
};
