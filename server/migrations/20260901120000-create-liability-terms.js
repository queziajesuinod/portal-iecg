const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);

    // 1) Flag rapida no proprio evento: "este evento exige termo de responsabilidade".
    await queryInterface.addColumn(
      { tableName: 'Events', schema },
      'requiresLiabilityTerm',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Quando true, exige aceite/assinatura do termo antes de confirmar a inscricao'
      }
    );

    // 2) Configuracao do termo (conteudo + layout) por evento. Uma config ativa por evento.
    await queryInterface.createTable(
      { tableName: 'EventLiabilityTerms', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'Events', schema }, key: 'id' },
          onDelete: 'CASCADE'
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Titulo exibido no topo do termo'
        },
        contentHtml: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: '',
          comment: 'Corpo do termo em HTML, com placeholders {{CHAVE}}'
        },
        backgroundImageUrl: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Imagem de fundo/marca dagua (data-URL base64). O texto e renderizado sobre ela.'
        },
        contentTopOffset: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0,
          comment: 'Percentual (0-100) da altura da imagem onde o cabecalho termina e o texto comeca'
        },
        contentBottomOffset: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0,
          comment: 'Percentual (0-100) reservado no rodape da imagem (opcional)'
        },
        signatureMode: {
          type: Sequelize.ENUM('DRAW', 'CHECKBOX', 'TYPED'),
          allowNull: false,
          defaultValue: 'DRAW',
          comment: 'DRAW = assinatura a mao; CHECKBOX = so aceite; TYPED = aceite + nome digitado'
        },
        requireDocument: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Exigir CPF/documento do responsavel no aceite'
        },
        participantNameField: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'fieldName (section=attendee) que identifica o nome do participante'
        },
        signerNameField: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'fieldName (section=attendee) que identifica o nome do responsavel'
        },
        signerDocumentField: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'fieldName (section=attendee) que identifica o CPF do responsavel'
        },
        version: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Incrementa a cada alteracao de conteudo; identifica qual versao foi assinada'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'Users', schema }, key: 'id' }
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

    await queryInterface.addIndex(
      { tableName: 'EventLiabilityTerms', schema },
      ['eventId', 'isActive'],
      { name: 'event_liability_terms_event_active_idx' }
    );

    // 3) Aceite/assinatura do termo por participante inscrito (auditoria).
    await queryInterface.createTable(
      { tableName: 'RegistrationTermAcceptances', schema },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        registrationId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'Registrations', schema }, key: 'id' },
          onDelete: 'CASCADE'
        },
        registrationAttendeeId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'RegistrationAttendees', schema }, key: 'id' },
          onDelete: 'CASCADE',
          comment: 'Participante (menor) coberto por este termo'
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: { tableName: 'Events', schema }, key: 'id' },
          onDelete: 'CASCADE',
          comment: 'Denormalizado para consulta/relatorio'
        },
        eventLiabilityTermId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: { tableName: 'EventLiabilityTerms', schema }, key: 'id' },
          onDelete: 'SET NULL'
        },
        termVersion: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Versao do termo aceita'
        },
        signerName: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Nome do responsavel que assinou'
        },
        signerDocument: {
          type: Sequelize.STRING(30),
          allowNull: true,
          comment: 'CPF/documento do responsavel'
        },
        participantName: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Snapshot do nome do participante coberto'
        },
        signatureImage: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Assinatura a mao (data-URL PNG base64), quando signatureMode=DRAW'
        },
        termSnapshotHtml: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'HTML do termo (placeholders ja preenchidos) exibido no momento do aceite'
        },
        contentHash: {
          type: Sequelize.STRING(64),
          allowNull: true,
          comment: 'SHA-256 do termSnapshotHtml (integridade do que foi assinado)'
        },
        ipAddress: {
          type: Sequelize.STRING(64),
          allowNull: true
        },
        userAgent: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        acceptedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
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

    await queryInterface.addIndex(
      { tableName: 'RegistrationTermAcceptances', schema },
      ['registrationId'],
      { name: 'registration_term_acceptances_registration_idx' }
    );
    await queryInterface.addIndex(
      { tableName: 'RegistrationTermAcceptances', schema },
      ['eventId', 'acceptedAt'],
      { name: 'registration_term_acceptances_event_accepted_idx' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'RegistrationTermAcceptances', schema });
    await queryInterface.dropTable({ tableName: 'EventLiabilityTerms', schema });
    await queryInterface.removeColumn({ tableName: 'Events', schema }, 'requiresLiabilityTerm');
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "${schema}"."enum_EventLiabilityTerms_signatureMode";`
    );
  }
};
