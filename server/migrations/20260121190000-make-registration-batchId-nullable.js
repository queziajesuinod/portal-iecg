module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    // Tornar batchId nullable em Registrations
    // Agora cada inscrito tem seu lote (RegistrationAttendees.batchId)
    await queryInterface.changeColumn(
      { tableName: 'Registrations', schema },
      'batchId',
      {
        type: Sequelize.UUID,
        allowNull: true, // ← Agora pode ser null
        references: {
          model: { tableName: 'EventBatches', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    );

    console.log('✅ Migration: batchId em Registrations agora é nullable');
  },

  async down(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    // Reverter: tornar batchId NOT NULL novamente
    await queryInterface.changeColumn(
      { tableName: 'Registrations', schema },
      'batchId',
      {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'EventBatches', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    );
  }
};
