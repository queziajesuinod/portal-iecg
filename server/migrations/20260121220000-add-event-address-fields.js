const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'addressNumber',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'neighborhood',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'city',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'cep',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'latitude',
      {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'longitude',
      {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      }
    );
    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'eventType',
      {
        type: Sequelize.ENUM('ACAMP', 'ENCONTRO', 'CONFERENCIA'),
        allowNull: false,
        defaultValue: 'ACAMP',
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'eventType');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'longitude');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'latitude');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'cep');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'city');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'neighborhood');
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'addressNumber');

    // Remover ENUM criado para eventType
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Events_eventType";');
  }
};
