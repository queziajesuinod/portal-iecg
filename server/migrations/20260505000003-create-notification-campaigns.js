const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      { tableName: 'NotificationCampaigns', schema },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        // 'whatsapp' | 'email' | 'push'
        channel: {
          type: Sequelize.STRING(30),
          allowNull: false,
          defaultValue: 'whatsapp'
        },
        templateId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'NotificationTemplates', schema }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        // Mensagem personalizada (alternativa ao template)
        customMessage: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        // 'group' | 'filter' | 'individual'
        audienceType: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'filter'
        },
        // Para audienceType='group': { groupId }
        // Para audienceType='filter': { sources: [...] }
        // Para audienceType='individual': { contact, name }
        audienceConfig: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {}
        },
        // 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'draft'
        },
        scheduledAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        sentAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        // Totais preenchidos após envio
        totalRecipients: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        totalSent: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        totalFailed: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'Users', schema }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'NotificationCampaigns', schema });
  }
};
