const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      { tableName: 'NotificationCampaignRecipients', schema },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4
        },
        campaignId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'NotificationCampaigns', schema }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        // 'member' | 'registration' | 'apelo' | 'lider_apelo'
        sourceType: {
          type: Sequelize.STRING(30),
          allowNull: false
        },
        // ID do registro de origem (member.id, registration.id, apelo.id, celula.id)
        sourceId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        // Telefone ou e-mail dependendo do canal
        contact: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        // Mensagem resolvida com variáveis substituídas
        resolvedMessage: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        // 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'pending'
        },
        sentAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        deliveredAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        readAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        errorMessage: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        // Resposta bruta do provedor de envio
        providerResponse: {
          type: Sequelize.JSONB,
          allowNull: true
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
      { tableName: 'NotificationCampaignRecipients', schema },
      ['campaignId'],
      { name: 'idx_notif_recipients_campaign' }
    );

    await queryInterface.addIndex(
      { tableName: 'NotificationCampaignRecipients', schema },
      ['status'],
      { name: 'idx_notif_recipients_status' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'NotificationCampaignRecipients', schema });
  }
};
