module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.createTable('CelulaReunioes', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      celulaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'celulas', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      data: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('agendada', 'aberta', 'encerrada', 'cancelada'),
        allowNull: false,
        defaultValue: 'agendada'
      },
      origem: {
        type: Sequelize.ENUM('automatica', 'manual'),
        allowNull: false,
        defaultValue: 'automatica'
      },
      motivoCancelamento: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      encerradaPorId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      observacoes: {
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
      { tableName: 'CelulaReunioes', schema },
      ['celulaId', 'data'],
      { name: 'idx_celula_reuniao_celula_data', unique: true }
    );
    await queryInterface.addIndex(
      { tableName: 'CelulaReunioes', schema },
      ['status', 'data'],
      { name: 'idx_celula_reuniao_status_data' }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'CelulaReunioes', schema });
  }
};
