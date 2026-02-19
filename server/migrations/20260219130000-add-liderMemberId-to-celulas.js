'use strict';

const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { tableName: 'celulas', schema };
    const definition = await queryInterface.describeTable(table);

    if (!definition.liderMemberId) {
      await queryInterface.addColumn(table, 'liderMemberId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'Members', schema },
          key: 'id'
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      });
    }

    await queryInterface.addIndex(table, ['liderMemberId'], {
      name: 'idx_celulas_lider_member_id',
      using: 'BTREE'
    }).catch((error) => {
      if (error?.original?.code !== '42P07') throw error;
    });
  },

  async down(queryInterface) {
    const table = { tableName: 'celulas', schema };
    await queryInterface.removeIndex(table, 'idx_celulas_lider_member_id').catch((error) => {
      if (error?.original?.code !== '42704') throw error;
    });

    const definition = await queryInterface.describeTable(table);
    if (definition.liderMemberId) {
      await queryInterface.removeColumn(table, 'liderMemberId');
    }
  }
};
