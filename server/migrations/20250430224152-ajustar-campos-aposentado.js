'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = { tableName: 'aposentados_mia', schema: 'dev_iecg' };

    // Remover os campos migrados para User
    await queryInterface.removeColumn(table, 'nome');
    await queryInterface.removeColumn(table, 'cpf');
    await queryInterface.removeColumn(table, 'foto');
    await queryInterface.removeColumn(table, 'rede_social');
    await queryInterface.removeColumn(table, 'data_nascimento');
    await queryInterface.removeColumn(table, 'endereco');
    await queryInterface.removeColumn(table, 'telefones');
    await queryInterface.removeColumn(table, 'estado_civil');
    await queryInterface.removeColumn(table, 'nome_esposo');
    await queryInterface.removeColumn(table, 'profissao');
    await queryInterface.removeColumn(table, 'frequenta_celula');
    await queryInterface.removeColumn(table, 'batizado');
    await queryInterface.removeColumn(table, 'encontro');
    await queryInterface.removeColumn(table, 'escolas');

    // Adicionar campo tipo_pessoa
    await queryInterface.addColumn(table, 'tipo_pessoa', {
      type: Sequelize.ENUM('Coordenadora','Coordenador', 'Líder', 'Pastor','Pastora', 'Apoio', 'Idoso'),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    const table = { tableName: 'aposentados_mia', schema: 'dev_iecg' };

    // Reverter a adição do ENUM
    await queryInterface.removeColumn(table, 'tipo_pessoa');

    // Recriar os campos removidos
    await queryInterface.addColumn(table, 'nome', Sequelize.STRING);
    await queryInterface.addColumn(table, 'cpf', Sequelize.TEXT);
    await queryInterface.addColumn(table, 'foto', Sequelize.TEXT);
    await queryInterface.addColumn(table, 'rede_social', Sequelize.STRING);
    await queryInterface.addColumn(table, 'data_nascimento', Sequelize.DATEONLY);
    await queryInterface.addColumn(table, 'endereco', Sequelize.TEXT);
    await queryInterface.addColumn(table, 'telefones', Sequelize.TEXT);
    await queryInterface.addColumn(table, 'estado_civil', Sequelize.ENUM('Solteiro', 'Casado', 'Viúvo', 'Divorciado'));
    await queryInterface.addColumn(table, 'nome_esposo', Sequelize.STRING);
    await queryInterface.addColumn(table, 'profissao', Sequelize.STRING);
    await queryInterface.addColumn(table, 'frequenta_celula', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn(table, 'batizado', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn(table, 'encontro', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn(table, 'escolas', Sequelize.TEXT);
  }
};
