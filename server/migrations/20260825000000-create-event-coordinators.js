const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);

    await queryInterface.createTable(
      { tableName: 'EventCoordinators', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
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
        memberId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Members', schema },
            key: 'id'
          },
          onDelete: 'SET NULL',
          comment: 'Membro vinculado como coordenador (opcional; pode ser contato avulso)'
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Nome do coordenador (override; usado quando nao ha membro vinculado)'
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'E-mail de contato (override do e-mail do membro)'
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'WhatsApp de contato (override do whatsapp do membro)'
        },
        channels: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: { email: true, whatsapp: false },
          comment: 'Canais de envio habilitados: { email, whatsapp }'
        },
        content: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {
            newRegistrants: true, fullList: true, partialPayments: true, netValue: true
          },
          comment: 'O que o coordenador recebe no relatorio'
        },
        listFields: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
          comment: 'Colunas selecionadas (ordenadas) das listas; vazio = padrao'
        },
        intervalDays: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 2,
          comment: 'Intervalo em dias entre os envios automaticos'
        },
        sendHour: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 8,
          comment: 'Hora local (0-23) do disparo automatico'
        },
        windowSource: {
          type: Sequelize.ENUM('BATCH_PERIOD', 'CUSTOM'),
          allowNull: false,
          defaultValue: 'BATCH_PERIOD',
          comment: 'BATCH_PERIOD = usa periodo de venda dos lotes; CUSTOM = usa windowStart/windowEnd'
        },
        windowStart: {
          type: Sequelize.DATE,
          allowNull: true
        },
        windowEnd: {
          type: Sequelize.DATE,
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        lastSentAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Data/hora do ultimo envio (base para "novos inscritos")'
        },
        nextRunAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Proximo disparo automatico agendado'
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          }
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }
    );

    await queryInterface.addIndex(
      { tableName: 'EventCoordinators', schema },
      ['eventId']
    );
    await queryInterface.addIndex(
      { tableName: 'EventCoordinators', schema },
      ['isActive', 'nextRunAt'],
      { name: 'event_coordinators_active_nextrun_idx' }
    );

    await queryInterface.createTable(
      { tableName: 'EventCoordinatorLogs', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        coordinatorId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'EventCoordinators', schema },
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        channel: {
          type: Sequelize.ENUM('email', 'whatsapp'),
          allowNull: false
        },
        trigger: {
          type: Sequelize.ENUM('scheduled', 'manual', 'test'),
          allowNull: false,
          defaultValue: 'scheduled'
        },
        status: {
          type: Sequelize.ENUM('sent', 'failed'),
          allowNull: false
        },
        recipient: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'E-mail ou telefone de destino'
        },
        externalId: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'messageId (e-mail) ou id da mensagem (WhatsApp)'
        },
        error: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        snapshot: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Numeros do relatorio no momento do envio (auditoria)'
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          }
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }
    );

    await queryInterface.addIndex(
      { tableName: 'EventCoordinatorLogs', schema },
      ['coordinatorId', 'createdAt'],
      { name: 'event_coordinator_logs_coordinator_created_idx' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'EventCoordinatorLogs', schema });
    await queryInterface.dropTable({ tableName: 'EventCoordinators', schema });
    // Remove os tipos ENUM criados pelo Postgres para as colunas acima
    const enums = [
      'enum_EventCoordinators_windowSource',
      'enum_EventCoordinatorLogs_channel',
      'enum_EventCoordinatorLogs_trigger',
      'enum_EventCoordinatorLogs_status'
    ];
    for (const enumName of enums) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."${enumName}";`);
    }
  }
};
