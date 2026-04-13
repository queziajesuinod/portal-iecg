'use strict';

const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);

    await queryInterface.createTable(
      { tableName: 'EventRegistrationRules', schema },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Events', schema },
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        formFieldId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'FormFields', schema },
            key: 'id'
          },
          onDelete: 'SET NULL',
          comment: 'Referência ao campo do formulário (opcional, para vínculo visual)'
        },
        fieldKey: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Chave do campo no JSON de dados (ex: estadoCivil, idade)'
        },
        operator: {
          type: Sequelize.ENUM(
            'eq', 'neq',
            'gt', 'gte', 'lt', 'lte',
            'in', 'not_in',
            'contains',
            'age_gte', 'age_lte', 'age_gt', 'age_lt'
          ),
          allowNull: false,
          comment: 'Operador de comparação. age_* calculam a idade a partir de uma data de nascimento'
        },
        value: {
          type: Sequelize.JSON,
          allowNull: false,
          comment: 'Valor de comparação (string, número ou array)'
        },
        errorMessage: {
          type: Sequelize.STRING(500),
          allowNull: false,
          comment: 'Mensagem exibida ao inscrito bloqueado'
        },
        appliesTo: {
          type: Sequelize.ENUM('buyer', 'attendee'),
          allowNull: false,
          defaultValue: 'attendee',
          comment: 'Se a regra se aplica ao comprador ou ao inscrito'
        },
        ruleGroup: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Regras do mesmo grupo são AND; grupos diferentes são OR'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      }
    );

    await queryInterface.addIndex(
      { tableName: 'EventRegistrationRules', schema },
      ['eventId'],
      { name: 'idx_registration_rules_eventid' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'EventRegistrationRules', schema });
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "${schema}"."enum_EventRegistrationRules_operator";`
    );
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "${schema}"."enum_EventRegistrationRules_appliesTo";`
    );
  }
};
