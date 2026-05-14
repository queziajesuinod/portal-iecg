module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.createTable('CelulaMembroVinculos', {
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
      membroId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      papel: {
        type: Sequelize.ENUM('membro', 'lider', 'co_lider', 'auxiliar'),
        allowNull: false,
        defaultValue: 'membro'
      },
      dataEntrada: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE')
      },
      dataSaida: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      origem: {
        type: Sequelize.ENUM('apelo', 'manual', 'transferencia', 'lideranca'),
        allowNull: false,
        defaultValue: 'manual'
      },
      apeloId: {
        type: Sequelize.UUID,
        allowNull: true
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
      { tableName: 'CelulaMembroVinculos', schema },
      ['celulaId', 'membroId'],
      { name: 'idx_celula_membro_vinculo_unique', unique: true, where: { ativo: true } }
    );
    await queryInterface.addIndex(
      { tableName: 'CelulaMembroVinculos', schema },
      ['membroId'],
      { name: 'idx_celula_membro_vinculo_membro' }
    );
    await queryInterface.addIndex(
      { tableName: 'CelulaMembroVinculos', schema },
      ['celulaId', 'ativo'],
      { name: 'idx_celula_membro_vinculo_celula_ativo' }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'CelulaMembroVinculos', schema });
  }
};
