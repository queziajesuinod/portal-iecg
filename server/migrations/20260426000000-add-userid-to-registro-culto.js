'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';
const TABLE = { schema: SCHEMA, tableName: 'registro_culto' };

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      TABLE,
      'userId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { schema: SCHEMA, tableName: 'Users' },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    );

    await queryInterface.addIndex(
      TABLE,
      ['userId'],
      { name: 'registro_culto_user_idx' }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(TABLE, 'registro_culto_user_idx');
    await queryInterface.removeColumn(TABLE, 'userId');
  }
};

