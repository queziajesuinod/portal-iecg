'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'celulas' },
      'campusId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { schema: SCHEMA, tableName: 'Campus' },
          key: 'id',
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
      }
    );

    await queryInterface.sequelize.query(`
      UPDATE "${SCHEMA}"."celulas" c
      SET "campusId" = campus.id
      FROM "${SCHEMA}"."Campus" campus
      WHERE c."campus" IS NOT NULL
        AND campus."nome" ILIKE c."campus"
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'celulas' },
      'campusId'
    );
  }
};
