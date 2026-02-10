'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'Users' },
      'is_lider_celula',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    );

    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'Users' },
      'conjuge_id',
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

    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'celulas' },
      'liderId',
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
  },

  async down(queryInterface) {
    await queryInterface.removeColumn({ schema: SCHEMA, tableName: 'celulas' }, 'liderId');
    await queryInterface.removeColumn({ schema: SCHEMA, tableName: 'Users' }, 'conjuge_id');
    await queryInterface.removeColumn({ schema: SCHEMA, tableName: 'Users' }, 'is_lider_celula');
  }
};
