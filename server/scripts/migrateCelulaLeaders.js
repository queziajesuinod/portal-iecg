#!/usr/bin/env node

const CelulaLeaderService = require('../services/celulaLeaderService');

CelulaLeaderService.migrateCelulaLeaders()
  .then((migrated) => {
    console.log(`Migrated leaders for ${migrated.length} células`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to migrate célula leaders:', error);
    process.exit(1);
  });
