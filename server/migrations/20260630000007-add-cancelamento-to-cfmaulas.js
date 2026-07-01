module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.addColumn(
      { schema, tableName: 'CfmAulas' },
      'cancelada',
      { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
    );
    await queryInterface.addColumn(
      { schema, tableName: 'CfmAulas' },
      'motivoCancelamento',
      { type: Sequelize.TEXT, allowNull: true }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeColumn({ schema, tableName: 'CfmAulas' }, 'cancelada');
    await queryInterface.removeColumn({ schema, tableName: 'CfmAulas' }, 'motivoCancelamento');
  },
};
