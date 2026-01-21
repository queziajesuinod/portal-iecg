module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    // 1. Adicionar coluna batchId (nullable inicialmente)
    await queryInterface.addColumn(
      { tableName: 'RegistrationAttendees', schema },
      'batchId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'EventBatches', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      }
    );

    // 2. Migrar dados existentes: copiar batchId da Registration pai
    await queryInterface.sequelize.query(`
      UPDATE ${schema}."RegistrationAttendees" ra
      SET "batchId" = r."batchId"
      FROM ${schema}."Registrations" r
      WHERE ra."registrationId" = r.id
      AND ra."batchId" IS NULL
    `);

    // 3. Tornar NOT NULL após migração dos dados existentes
    await queryInterface.changeColumn(
      { tableName: 'RegistrationAttendees', schema },
      'batchId',
      {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'EventBatches', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      }
    );

    console.log('✅ Migration: batchId adicionado a RegistrationAttendees');
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.removeColumn(
      { tableName: 'RegistrationAttendees', schema },
      'batchId'
    );

    console.log('✅ Rollback: batchId removido de RegistrationAttendees');
  }
};
