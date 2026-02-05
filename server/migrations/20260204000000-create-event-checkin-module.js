const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // EventCheckInSchedules: Agendamentos de check-in
    await queryInterface.createTable(
      'EventCheckInSchedules',
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
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Nome do agendamento (ex: Credenciamento Manhã)'
        },
        startTime: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'Data/hora de início do período de check-in'
        },
        endTime: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'Data/hora de fim do período de check-in'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          comment: 'Se o agendamento está ativo'
        },
        notificationGroupId: {
          type: Sequelize.UUID,
          allowNull: true,
          comment: 'ID do grupo de notificação associado'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      },
      { schema }
    );

    // EventCheckInStations: Pontos de check-in
    await queryInterface.createTable(
      'EventCheckInStations',
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
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Nome do ponto de check-in (ex: Entrada Principal)'
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 7),
          allowNull: true,
          comment: 'Latitude do ponto de check-in'
        },
        longitude: {
          type: Sequelize.DECIMAL(10, 7),
          allowNull: true,
          comment: 'Longitude do ponto de check-in'
        },
        nfcTagId: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'ID da tag NFC associada'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          comment: 'Se a estação está ativa'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      },
      { schema }
    );

    // EventCheckIns: Registro de check-ins
    await queryInterface.createTable(
      'EventCheckIns',
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        registrationId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Registrations', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        attendeeId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'RegistrationAttendees', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'ID do inscrito específico (se aplicável)'
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Events', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        scheduleId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'EventCheckInSchedules', schema },
            key: 'id'
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL',
          comment: 'Agendamento em que o check-in foi realizado'
        },
        stationId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'EventCheckInStations', schema },
            key: 'id'
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL',
          comment: 'Estação onde o check-in foi realizado'
        },
        checkInMethod: {
          type: Sequelize.ENUM('manual', 'qrcode', 'nfc'),
          allowNull: false,
          comment: 'Método utilizado para o check-in'
        },
        checkInAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Data/hora do check-in'
        },
        checkInBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL',
          comment: 'Staff que realizou o check-in (apenas para manual)'
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 7),
          allowNull: true,
          comment: 'Latitude onde o check-in foi realizado'
        },
        longitude: {
          type: Sequelize.DECIMAL(10, 7),
          allowNull: true,
          comment: 'Longitude onde o check-in foi realizado'
        },
        deviceInfo: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Informações do dispositivo usado'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Observações sobre o check-in'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      },
      { schema }
    );

    // Índices para performance
    await queryInterface.addIndex(
      { tableName: 'EventCheckIns', schema },
      ['eventId', 'checkInAt'],
      { name: 'idx_checkins_event_time' }
    );

    await queryInterface.addIndex(
      { tableName: 'EventCheckIns', schema },
      ['registrationId'],
      { name: 'idx_checkins_registration' }
    );

    await queryInterface.addIndex(
      { tableName: 'EventCheckInSchedules', schema },
      ['eventId', 'isActive'],
      { name: 'idx_schedules_event_active' }
    );

    await queryInterface.addIndex(
      { tableName: 'EventCheckInStations', schema },
      ['eventId', 'isActive'],
      { name: 'idx_stations_event_active' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'EventCheckIns', schema });
    await queryInterface.dropTable({ tableName: 'EventCheckInStations', schema });
    await queryInterface.dropTable({ tableName: 'EventCheckInSchedules', schema });
    
    // Drop ENUMs
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_EventCheckIns_checkInMethod";`);
  }
};
