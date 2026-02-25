const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ========== HOSPEDAGEM: Configuração dos quartos ==========
    await queryInterface.createTable(
      'EventHousingConfigs',
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
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        rooms: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Array de quartos: [{id, name, capacity}]',
        },
        customRules: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Regras adicionais em linguagem natural definidas pelo usuário',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      { schema }
    );

    // ========== HOSPEDAGEM: Alocação gerada ==========
    await queryInterface.createTable(
      'EventHousingAllocations',
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
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        attendeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'RegistrationAttendees', schema },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        roomId: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'ID do quarto (ex: "1", "2")',
        },
        roomName: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Nome do quarto (ex: "Quarto 1")',
        },
        slotLabel: {
          type: Sequelize.STRING(20),
          allowNull: false,
          comment: 'Label da cama (ex: "1.1", "1.2")',
        },
        llmReasoning: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Explicação do LLM para esta alocação',
        },
        generatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      { schema }
    );

    // ========== TIMES: Configuração ==========
    await queryInterface.createTable(
      'EventTeamsConfigs',
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
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        teamsCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Quantidade de times',
        },
        playersPerTeam: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Jogadores por time (null = distribuição automática)',
        },
        teamNames: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Nomes dos times: ["Time A", "Time B"]',
        },
        customRules: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Regras adicionais em linguagem natural',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      { schema }
    );

    // ========== TIMES: Alocação gerada ==========
    await queryInterface.createTable(
      'EventTeamsAllocations',
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
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        attendeeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'RegistrationAttendees', schema },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        teamId: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'ID do time (ex: "1", "2")',
        },
        teamName: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Nome do time',
        },
        llmReasoning: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Explicação do LLM para esta alocação',
        },
        generatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      { schema }
    );

    // ========== ÍNDICES ==========
    await queryInterface.addIndex(
      { tableName: 'EventHousingAllocations', schema },
      ['eventId', 'attendeeId'],
      { name: 'idx_housing_event_attendee', unique: true }
    );

    await queryInterface.addIndex(
      { tableName: 'EventTeamsAllocations', schema },
      ['eventId', 'attendeeId'],
      { name: 'idx_teams_event_attendee', unique: true }
    );

    await queryInterface.addIndex(
      { tableName: 'EventHousingConfigs', schema },
      ['eventId'],
      { name: 'idx_housing_config_event' }
    );

    await queryInterface.addIndex(
      { tableName: 'EventTeamsConfigs', schema },
      ['eventId'],
      { name: 'idx_teams_config_event' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'EventTeamsAllocations', schema });
    await queryInterface.dropTable({ tableName: 'EventTeamsConfigs', schema });
    await queryInterface.dropTable({ tableName: 'EventHousingAllocations', schema });
    await queryInterface.dropTable({ tableName: 'EventHousingConfigs', schema });
  },
};
