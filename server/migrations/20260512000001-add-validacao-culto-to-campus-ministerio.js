require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'campus_ministerio' },
      'diasPadrao',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      }
    );

    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'campus_ministerio' },
      'responsavelMemberId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { schema: SCHEMA, tableName: 'Members' },
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }
    );

    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'campus_ministerio' },
      'validacaoAtiva',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'campus_ministerio' },
      'diasPadrao'
    );
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'campus_ministerio' },
      'responsavelMemberId'
    );
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'campus_ministerio' },
      'validacaoAtiva'
    );
  },
};
