module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = { tableName: 'Users', schema: 'dev_iecg' };

    await queryInterface.addColumn(table, 'data_nascimento', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    await queryInterface.addColumn(table, 'endereco', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn(table, 'telefone', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn(table, 'cpf', {
      type: Sequelize.TEXT,
      allowNull: true
    });


    await queryInterface.addColumn(table, 'estado_civil', {
      type: Sequelize.ENUM('Solteiro', 'Casado', 'Viúvo', 'Divorciado'),
      allowNull: true
    });

    await queryInterface.addColumn(table, 'nome_esposo', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn(table, 'profissao', {
      type: Sequelize.STRING,
      allowNull: true
    });

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

    await queryInterface.addColumn(table, 'escolas', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    const table = { tableName: 'Users', schema: 'dev_iecg' };

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
    await queryInterface.removeColumn(table, 'cpf');

    // Atenção: não remove ENUM automaticamente do banco, se necessário, drop manual no banco
  }
};
