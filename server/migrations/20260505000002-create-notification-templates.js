const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      { tableName: 'NotificationTemplates', schema },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        // 'whatsapp' | 'email' | 'push'
        channel: {
          type: Sequelize.STRING(30),
          allowNull: false,
          defaultValue: 'whatsapp'
        },
        // Corpo da mensagem com variáveis: {{nome}}, {{evento}}, etc.
        body: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        // Lista das variáveis disponíveis: ['nome', 'evento', 'celula']
        variables: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: []
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'Users', schema }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        updatedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'Users', schema }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'NotificationTemplates', schema });
  }
};
