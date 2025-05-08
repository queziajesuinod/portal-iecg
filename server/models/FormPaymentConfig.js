module.exports = (sequelize, DataTypes) => {
    const FormPaymentConfig = sequelize.define('FormPaymentConfig', {
      formId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'forms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      totalAmount: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      minEntry: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: false
      },
      gateway: {
        type: DataTypes.STRING,
        allowNull: false
      },
      returnUrl: {
        type: DataTypes.STRING,
        allowNull: true
      }
    }, {
      tableName: 'form_payment_configs'
    });
  
    FormPaymentConfig.associate = models => {
      FormPaymentConfig.belongsTo(models.Form, { foreignKey: 'formId' });
    };
  
    return FormPaymentConfig;
  };
  