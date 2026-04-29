'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.addColumn(
      { tableName: 'voluntariado', schema },
      'campusId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Campus', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.removeColumn(
      { tableName: 'voluntariado', schema },
      'campusId'
    );
  }
};
