'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const challengesTable = { tableName: 'BoardChallenges', schema };
    const submissionsTable = { tableName: 'BoardChallengeSubmissions', schema };

    const challengeDefinition = await queryInterface.describeTable(challengesTable);
    if (!challengeDefinition.allowSecondChance) {
      await queryInterface.addColumn(challengesTable, 'allowSecondChance', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!challengeDefinition.secondChancePoints) {
      await queryInterface.addColumn(challengesTable, 'secondChancePoints', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    const submissionDefinition = await queryInterface.describeTable(submissionsTable);
    if (!submissionDefinition.attemptNumber) {
      await queryInterface.addColumn(submissionsTable, 'attemptNumber', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
    }
    if (!submissionDefinition.pointsAwarded) {
      await queryInterface.addColumn(submissionsTable, 'pointsAwarded', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const challengesTable = { tableName: 'BoardChallenges', schema };
    const submissionsTable = { tableName: 'BoardChallengeSubmissions', schema };

    await queryInterface.removeColumn(submissionsTable, 'pointsAwarded').catch(() => null);
    await queryInterface.removeColumn(submissionsTable, 'attemptNumber').catch(() => null);
    await queryInterface.removeColumn(challengesTable, 'secondChancePoints').catch(() => null);
    await queryInterface.removeColumn(challengesTable, 'allowSecondChance').catch(() => null);
  }
};
