require('dotenv').config();
const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameColumn(
      { tableName: 'CfmInscricoes', schema: SCHEMA },
      'marcoActivityId',
      'marcoMilestoneId'
    );
  },
  async down(queryInterface) {
    await queryInterface.renameColumn(
      { tableName: 'CfmInscricoes', schema: SCHEMA },
      'marcoMilestoneId',
      'marcoActivityId'
    );
  },
};
