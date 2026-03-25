'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'campus_ministerio' },
      {
        campusId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'Campus' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        ministerioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'ministerio' }, key: 'id' },
          onDelete: 'CASCADE',
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
      { schema: SCHEMA, tableName: 'campus_ministerio' },
      {
        fields: ['campusId', 'ministerioId'],
        type: 'primary key',
        name: 'campus_ministerio_pkey',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'campus_ministerio' });
  },
};
