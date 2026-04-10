'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.createTable('voluntariado', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      memberId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      areaVoluntariadoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'area_voluntariado', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      dataInicio: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      dataFim: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('PENDENTE', 'APROVADO', 'ENCERRADO'),
        allowNull: false,
        defaultValue: 'PENDENTE'
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
      { tableName: 'voluntariado', schema },
      ['memberId'],
      { name: 'idx_voluntariado_member' }
    );

    await queryInterface.addIndex(
      { tableName: 'voluntariado', schema },
      ['areaVoluntariadoId'],
      { name: 'idx_voluntariado_area' }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'voluntariado', schema });
  }
};
