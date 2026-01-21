'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FormField extends Model {
    static associate(models) {
      FormField.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }

  FormField.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    fieldType: {
      type: DataTypes.ENUM(
        'text',
        'email',
        'phone',
        'number',
        'textarea',
        'select',
        'checkbox',
        'radio',
        'date',
        'cpf',
        'file'
      ),
      allowNull: false,
    },
    fieldLabel: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Label exibido no formulário'
    },
    fieldName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nome único do campo (usado como chave)'
    },
    placeholder: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array de opções para select, radio, checkbox'
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ordem de exibição no formulário'
    },
    section: {
      type: DataTypes.ENUM('buyer', 'attendee'),
      allowNull: false,
      defaultValue: 'attendee',
      comment: 'buyer = dados do comprador (1x), attendee = dados dos inscritos (repete)'
    },
    validationRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Regras de validação adicionais'
    },
  }, {
    sequelize,
    modelName: 'FormField',
    tableName: 'FormFields',
    schema: process.env.DB_SCHEMA || 'dev_iecg',
    timestamps: true,
  });

  return FormField;
};
