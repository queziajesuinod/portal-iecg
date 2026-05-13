require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'culto_ausencia_justificada' },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.fn('gen_random_uuid'),
          primaryKey: true,
          allowNull: false,
        },
        campusId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'Campus' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        ministerioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { schema: SCHEMA, tableName: 'ministerio' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        data: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        motivo: {
          type: Sequelize.STRING(300),
          allowNull: true,
        },
        criadoPorUserId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { schema: SCHEMA, tableName: 'Users' }, key: 'id' },
          onDelete: 'SET NULL',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
      }
    );

    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'culto_ausencia_justificada' },
      {
        fields: ['campusId', 'ministerioId', 'data'],
        type: 'unique',
        name: 'culto_ausencia_justificada_unique',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'culto_ausencia_justificada' });
  },
};
