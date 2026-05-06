const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      { tableName: 'NotificationGroups', schema },
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
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        // JSON array de sources com filtros dinâmicos
        // [{ type, filters, contactField }]
        sources: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: []
        },
        // 'phone' | 'email' — campo usado para deduplicar contatos
        deduplicateBy: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'phone'
        },
        createdBy: {
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
    await queryInterface.dropTable({ tableName: 'NotificationGroups', schema });
  }
};
