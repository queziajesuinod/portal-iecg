const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'NotificationCampaignRecipients', schema },
      'externalId',
      {
        type: Sequelize.STRING(255),
        allowNull: true
      }
    );

    await queryInterface.addIndex(
      { tableName: 'NotificationCampaignRecipients', schema },
      ['externalId'],
      { name: 'idx_notif_recipients_external_id' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      { tableName: 'NotificationCampaignRecipients', schema },
      'idx_notif_recipients_external_id'
    );
    await queryInterface.removeColumn(
      { tableName: 'NotificationCampaignRecipients', schema },
      'externalId'
    );
  }
};
