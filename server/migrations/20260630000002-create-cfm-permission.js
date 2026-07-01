const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    const now = new Date();
    const permissoesTable = { tableName: 'Permissoes', schema };
    const perfilPermissoesTable = { tableName: 'PerfilPermissoes', schema };

    // Cria a permissão CFM_ADMIN se ainda não existir
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM "${schema}"."Permissoes" WHERE nome = :nome LIMIT 1`,
      { replacements: { nome: 'CFM_ADMIN' }, type: Sequelize.QueryTypes.SELECT }
    );

    let permissionId = existing?.id || null;
    if (!permissionId) {
      permissionId = uuidv4();
      await queryInterface.bulkInsert(permissoesTable, [{
        id: permissionId,
        nome: 'CFM_ADMIN',
        descricao: 'Acesso completo ao módulo CFM — Centro de Formação (escolas, turmas, alunos)',
        createdAt: now,
        updatedAt: now,
      }]);
    }

    // Vincula ao perfil Administrador
    const [adminPerfil] = await queryInterface.sequelize.query(
      `SELECT id FROM "${schema}"."Perfis" WHERE descricao = :descricao LIMIT 1`,
      { replacements: { descricao: 'Administrador' }, type: Sequelize.QueryTypes.SELECT }
    );

    if (adminPerfil?.id) {
      const [existingLink] = await queryInterface.sequelize.query(
        `SELECT id FROM "${schema}"."PerfilPermissoes" WHERE "perfilId" = :perfilId AND "permissaoId" = :permissaoId LIMIT 1`,
        { replacements: { perfilId: adminPerfil.id, permissaoId: permissionId }, type: Sequelize.QueryTypes.SELECT }
      );
      if (!existingLink) {
        await queryInterface.bulkInsert(perfilPermissoesTable, [{
          id: uuidv4(),
          perfilId: adminPerfil.id,
          permissaoId: permissionId,
          createdAt: now,
          updatedAt: now,
        }]);
      }
    }
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    await queryInterface.sequelize.query(
      `DELETE FROM "${schema}"."Permissoes" WHERE nome = 'CFM_ADMIN'`
    );
  },
};
