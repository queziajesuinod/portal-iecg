const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // EventNotificationGroups: Grupos de notificação
    await queryInterface.createTable(
      'EventNotificationGroups',
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
          comment: 'Nome do grupo (ex: Inscritos Lote 1)'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Descrição do grupo'
        },
        filterCriteria: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Critérios de filtro para segmentação automática'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
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

    // EventNotificationGroupMembers: Membros dos grupos
    await queryInterface.createTable(
      'EventNotificationGroupMembers',
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        groupId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'EventNotificationGroups', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
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
          comment: 'ID do inscrito específico (opcional)'
        },
        addedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        addedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL',
          comment: 'Usuário que adicionou (null = automático)'
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

    // EventNotificationTemplates: Templates de mensagens
    await queryInterface.createTable(
      'EventNotificationTemplates',
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Events', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Evento específico (null = template global)'
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Nome do template'
        },
        type: {
          type: Sequelize.ENUM('confirmation', 'reminder', 'checkin', 'custom'),
          allowNull: false,
          comment: 'Tipo de notificação'
        },
        channel: {
          type: Sequelize.ENUM('whatsapp', 'sms', 'email'),
          allowNull: false,
          defaultValue: 'whatsapp',
          comment: 'Canal de envio'
        },
        subject: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Assunto (para email)'
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Corpo da mensagem com variáveis {{nome}}, {{evento}}, etc'
        },
        mediaUrl: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'URL de mídia anexa (imagem, PDF, etc)'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
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

    // EventNotifications: Histórico de notificações enviadas
    await queryInterface.createTable(
      'EventNotifications',
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
        templateId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'EventNotificationTemplates', schema },
            key: 'id'
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL'
        },
        groupId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'EventNotificationGroups', schema },
            key: 'id'
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL',
          comment: 'Grupo de notificação (se enviado em campanha)'
        },
        channel: {
          type: Sequelize.ENUM('whatsapp', 'sms', 'email'),
          allowNull: false,
          comment: 'Canal de envio'
        },
        recipient: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Destinatário (telefone ou email)'
        },
        subject: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Mensagem enviada (com variáveis já substituídas)'
        },
        mediaUrl: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
          allowNull: false,
          defaultValue: 'pending'
        },
        externalId: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'ID externo da Evolution API ou outro provedor'
        },
        errorMessage: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Mensagem de erro (se falhou)'
        },
        sentAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Data/hora de envio'
        },
        deliveredAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Data/hora de entrega'
        },
        readAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Data/hora de leitura'
        },
        sentBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL',
          comment: 'Usuário que enviou (null = automático)'
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
      { tableName: 'EventNotifications', schema },
      ['eventId', 'status', 'createdAt'],
      { name: 'idx_notifications_event_status' }
    );

    await queryInterface.addIndex(
      { tableName: 'EventNotifications', schema },
      ['registrationId'],
      { name: 'idx_notifications_registration' }
    );

    await queryInterface.addIndex(
      { tableName: 'EventNotificationGroupMembers', schema },
      ['groupId', 'registrationId'],
      { name: 'idx_group_members_unique', unique: true }
    );

    await queryInterface.addIndex(
      { tableName: 'EventNotificationTemplates', schema },
      ['eventId', 'type', 'isActive'],
      { name: 'idx_templates_event_type' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'EventNotifications', schema });
    await queryInterface.dropTable({ tableName: 'EventNotificationTemplates', schema });
    await queryInterface.dropTable({ tableName: 'EventNotificationGroupMembers', schema });
    await queryInterface.dropTable({ tableName: 'EventNotificationGroups', schema });
    
    // Drop ENUMs
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_EventNotificationTemplates_type";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_EventNotificationTemplates_channel";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_EventNotifications_channel";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_EventNotifications_status";`);
  }
};
