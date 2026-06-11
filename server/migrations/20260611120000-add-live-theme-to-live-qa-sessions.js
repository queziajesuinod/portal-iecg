require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'LiveQaSessions' },
      'liveTheme',
      {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Aparência da tela ao vivo: cores, fundo, imagem',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'LiveQaSessions' },
      'liveTheme'
    );
  },
};
