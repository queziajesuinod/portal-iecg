const { syncGroupsForSourceType } = require('../services/notificationGroupSyncService');

function setupAudienceAutoSync(db) {
  const attach = (ModelName, ...sourceTypes) => {
    const Model = db[ModelName];
    if (!Model) return;
    const handler = () => sourceTypes.forEach((t) => syncGroupsForSourceType(t));
    Model.addHook('afterCreate', `audienceSync_${ModelName}`, handler);
    Model.addHook('afterUpdate', `audienceSync_${ModelName}`, handler);
    Model.addHook('afterDestroy', `audienceSync_${ModelName}`, handler);
    Model.addHook('afterBulkCreate', `audienceBulkSync_${ModelName}`, handler);
    Model.addHook('afterBulkUpdate', `audienceBulkSync_${ModelName}`, handler);
    Model.addHook('afterBulkDestroy', `audienceBulkSync_${ModelName}`, handler);
  };

  attach('Member', 'members');
  attach('Registration', 'registrations');
  attach('Voluntariado', 'voluntarios');
  attach('ApeloDirecionadoCelula', 'apelos', 'liders_apelos');
}

module.exports = { setupAudienceAutoSync };
