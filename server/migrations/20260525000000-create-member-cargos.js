module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.createTable('MemberCargos', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      membroId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      cargo: {
        type: Sequelize.ENUM('lideranca', 'pastor_geracao', 'pastor_campus'),
        allowNull: false
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      observacao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, { schema });

    await queryInterface.addIndex(
      { tableName: 'MemberCargos', schema },
      ['membroId', 'cargo'],
      { name: 'idx_member_cargo_unique', unique: true, where: { ativo: true } }
    );
    await queryInterface.addIndex(
      { tableName: 'MemberCargos', schema },
      ['cargo', 'ativo'],
      { name: 'idx_member_cargo_cargo_ativo' }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'MemberCargos', schema });
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${schema}"."enum_MemberCargos_cargo";`);
  }
};
