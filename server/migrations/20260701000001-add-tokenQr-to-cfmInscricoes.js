const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.addColumn({ tableName: 'CfmInscricoes', schema }, 'tokenQr', {
      type: Sequelize.UUID,
      allowNull: true,
      unique: true,
    });
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id FROM "${schema}"."CfmInscricoes" WHERE "tokenQr" IS NULL`
    );
    for (const row of rows) {
      await queryInterface.sequelize.query(
        `UPDATE "${schema}"."CfmInscricoes" SET "tokenQr" = :token WHERE id = :id`,
        { replacements: { token: randomUUID(), id: row.id } }
      );
    }
  },
  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeColumn({ tableName: 'CfmInscricoes', schema }, 'tokenQr');
  },
};
