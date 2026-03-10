'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const challengesTable = { tableName: 'BoardChallenges', schema };

    await queryInterface.addColumn(challengesTable, 'contentHtml', {
      type: Sequelize.TEXT,
      allowNull: true
    }).catch(() => null);

    await queryInterface.sequelize.query(
      `ALTER TYPE "${schema}"."enum_BoardChallenges_challengeType" ADD VALUE IF NOT EXISTS 'lesson';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "${schema}"."enum_BoardChallengeSubmissions_responseType" ADD VALUE IF NOT EXISTS 'lesson';`
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const challengesTable = { tableName: 'BoardChallenges', schema };

    await queryInterface.removeColumn(challengesTable, 'contentHtml').catch(() => null);
  }
};
