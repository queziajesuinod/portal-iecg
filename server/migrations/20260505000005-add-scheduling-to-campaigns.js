const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn({ tableName: 'NotificationCampaigns', schema }, 'sendDelayMs', {
      type: Sequelize.INTEGER, allowNull: false, defaultValue: 500
    });
    await queryInterface.addColumn({ tableName: 'NotificationCampaigns', schema }, 'recurrenceType', {
      type: Sequelize.STRING(20), allowNull: false, defaultValue: 'once'
    });
    // Para weekly: [0,1,5] = Dom, Seg, Sex
    await queryInterface.addColumn({ tableName: 'NotificationCampaigns', schema }, 'recurrenceDays', {
      type: Sequelize.JSONB, allowNull: true
    });
    // Horário do disparo recorrente: 'HH:MM'
    await queryInterface.addColumn({ tableName: 'NotificationCampaigns', schema }, 'recurrenceTime', {
      type: Sequelize.STRING(5), allowNull: true
    });
    await queryInterface.addColumn({ tableName: 'NotificationCampaigns', schema }, 'recurrencePeriodStart', {
      type: Sequelize.DATEONLY, allowNull: true
    });
    await queryInterface.addColumn({ tableName: 'NotificationCampaigns', schema }, 'recurrencePeriodEnd', {
      type: Sequelize.DATEONLY, allowNull: true
    });
    await queryInterface.addColumn({ tableName: 'NotificationCampaigns', schema }, 'nextRunAt', {
      type: Sequelize.DATE, allowNull: true
    });
  },

  down: async (queryInterface) => {
    const cols = ['sendDelayMs', 'recurrenceType', 'recurrenceDays', 'recurrenceTime',
      'recurrencePeriodStart', 'recurrencePeriodEnd', 'nextRunAt'];
    for (const col of cols) {
      await queryInterface.removeColumn({ tableName: 'NotificationCampaigns', schema }, col);
    }
  }
};
