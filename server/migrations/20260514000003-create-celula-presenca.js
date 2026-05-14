module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    await queryInterface.createTable('PreCadastroPresencas', {
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
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      telefone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      whatsapp: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      tipo: {
        type: Sequelize.ENUM('visitante', 'novo_integrante'),
        allowNull: false,
        defaultValue: 'visitante'
      },
      apeloId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      promovidoEmMembroId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      promovidoEm: {
        type: Sequelize.DATE,
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

    await queryInterface.createTable('CelulaPresencas', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()')
      },
      reuniaoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'CelulaReunioes', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      membroId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { tableName: 'Members', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      preCadastroId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: { tableName: 'PreCadastroPresencas', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      presente: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      registradoEm: {
        type: Sequelize.DATE,
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
      { tableName: 'CelulaPresencas', schema },
      ['reuniaoId', 'membroId'],
      { name: 'idx_celula_presenca_reuniao_membro', unique: true, where: { membroId: { [Sequelize.Op.ne]: null } } }
    );
    await queryInterface.addIndex(
      { tableName: 'CelulaPresencas', schema },
      ['membroId'],
      { name: 'idx_celula_presenca_membro' }
    );
    await queryInterface.addIndex(
      { tableName: 'CelulaPresencas', schema },
      ['reuniaoId'],
      { name: 'idx_celula_presenca_reuniao' }
    );

    await queryInterface.createTable('CelulaPresencaPontos', {
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
      reuniaoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'CelulaReunioes', schema }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      pontosBase: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      pontosBonus: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      motivoBonus: {
        type: Sequelize.STRING(100),
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
      { tableName: 'CelulaPresencaPontos', schema },
      ['membroId', 'reuniaoId'],
      { name: 'idx_celula_presenca_ponto_unique', unique: true }
    );
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.dropTable({ tableName: 'CelulaPresencaPontos', schema });
    await queryInterface.dropTable({ tableName: 'CelulaPresencas', schema });
    await queryInterface.dropTable({ tableName: 'PreCadastroPresencas', schema });
  }
};
