require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'ministro_campus_ministerio' },
      {
        ministroId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: { schema: SCHEMA, tableName: 'ministro' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        campusId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        ministerioId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      }
    );

    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'ministro_campus_ministerio' },
      {
        fields: ['campusId', 'ministerioId'],
        type: 'foreign key',
        name: 'fk_mcm_campus_ministerio',
        references: { table: { schema: SCHEMA, tableName: 'campus_ministerio' }, fields: ['campusId', 'ministerioId'] },
        onDelete: 'CASCADE',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'ministro_campus_ministerio' });
  },
};
