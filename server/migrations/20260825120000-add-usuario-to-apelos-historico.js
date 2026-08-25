require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'apelos_direcionados_historico' };
    // Quem fez a movimentação/alteração de status. Fica nulo em ações públicas;
    // usa rótulos "Sistema"/"Sistema (fila)" para transições automáticas.
    await queryInterface.addColumn(table, 'usuario_id', {
      type: Sequelize.UUID,
      allowNull: true
    });
    await queryInterface.addColumn(table, 'usuario_nome', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    const table = { schema: SCHEMA, tableName: 'apelos_direcionados_historico' };
    await queryInterface.removeColumn(table, 'usuario_nome');
    await queryInterface.removeColumn(table, 'usuario_id');
  }
};
