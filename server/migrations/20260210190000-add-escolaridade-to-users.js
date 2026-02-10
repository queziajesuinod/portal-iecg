'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';
const TABLE = { schema: SCHEMA, tableName: 'Users' };
const ENUM_NAME = 'enum_Users_escolaridade';

const ESCOLARIDADE_VALUES = [
  'ANALFABETO',
  'ENSINO FUNDAMENTAL INCOMPLETO',
  'ENSINO FUNDAMENTAL COMPLETO',
  'ENSINO MÉDIO INCOMPLETO',
  'ENSINO MÉDIO COMPLETO',
  'ENSINO SUPERIOR INCOMPLETO',
  'ENSINO SUPERIOR COMPLETO'
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${ENUM_NAME}') THEN
          CREATE TYPE "${ENUM_NAME}" AS ENUM (${ESCOLARIDADE_VALUES.map((value) => `'${value}'`).join(', ')});
        END IF;
      END
      $$;
    `);
    await queryInterface.addColumn(TABLE, 'escolaridade', {
      type: Sequelize.ENUM(...ESCOLARIDADE_VALUES),
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(TABLE, 'escolaridade');
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM_NAME}";`);
  }
};
