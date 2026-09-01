const schema = process.env.DB_SCHEMA || 'dev_iecg';

// Reconcilia a tabela EventLiabilityTerms com o modelo atual:
// - renomeia headerImageUrl -> backgroundImageUrl (marca d'agua)
// - adiciona contentTopOffset / contentBottomOffset (mapeamento do cabecalho/rodape)
// - adiciona participantNameField / signerNameField / signerDocumentField (placeholders dinamicos)
// Idempotente: usa describeTable para so aplicar o que falta (cobre bases criadas
// em versoes intermediarias da migration de criacao).
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { tableName: 'EventLiabilityTerms', schema };
    let desc = await queryInterface.describeTable(table);

    if (desc.headerImageUrl && !desc.backgroundImageUrl) {
      await queryInterface.renameColumn(table, 'headerImageUrl', 'backgroundImageUrl');
    } else if (!desc.backgroundImageUrl) {
      await queryInterface.addColumn(table, 'backgroundImageUrl', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Imagem de fundo/marca dagua (data-URL base64)'
      });
    }

    desc = await queryInterface.describeTable(table);
    const addIfMissing = async (name, def) => {
      if (!desc[name]) await queryInterface.addColumn(table, name, def);
    };

    await addIfMissing('contentTopOffset', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Percentual (0-100) onde o cabecalho da imagem termina'
    });
    await addIfMissing('contentBottomOffset', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Percentual (0-100) reservado no rodape'
    });
    await addIfMissing('participantNameField', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'fieldName (attendee) do nome do participante'
    });
    await addIfMissing('signerNameField', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'fieldName (attendee) do nome do responsavel'
    });
    await addIfMissing('signerDocumentField', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'fieldName (attendee) do CPF do responsavel'
    });
  },

  async down(queryInterface) {
    const table = { tableName: 'EventLiabilityTerms', schema };
    for (const col of ['contentTopOffset', 'contentBottomOffset', 'participantNameField', 'signerNameField', 'signerDocumentField']) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn(table, col).catch(() => {});
    }
    const desc = await queryInterface.describeTable(table);
    if (desc.backgroundImageUrl && !desc.headerImageUrl) {
      await queryInterface.renameColumn(table, 'backgroundImageUrl', 'headerImageUrl');
    }
  }
};
