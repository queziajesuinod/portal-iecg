module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);

    await queryInterface.createTable(
      { tableName: 'MemberDuplicateDismissals', schema },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          allowNull: false,
          primaryKey: true
        },
        firstMemberId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Members', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        secondMemberId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Members', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        dismissedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        reasonSnapshot: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: []
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }
    );

    await queryInterface.addIndex(
      { tableName: 'MemberDuplicateDismissals', schema },
      ['firstMemberId', 'secondMemberId'],
      {
        unique: true,
        name: 'idx_member_duplicate_dismissals_pair_unique'
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'MemberDuplicateDismissals', schema });
  }
};
