'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable({ tableName: 'PaymentOptions', schema: 'dev_iecg' }, {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      eventId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'Events', schema: 'dev_iecg' },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID do evento'
      },
      paymentType: {
        type: Sequelize.ENUM('credit_card', 'pix', 'boleto'),
        allowNull: false,
        comment: 'Tipo de pagamento'
      },
      maxInstallments: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
        comment: 'Número máximo de parcelas (apenas para cartão)'
      },
      interestRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Taxa de juros por parcela'
      },
      interestType: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: true,
        defaultValue: 'percentage',
        comment: 'Tipo de juros: percentual ou fixo'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Se a forma de pagamento está ativa'
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
    });

    // Adicionar índice para buscar formas de pagamento por evento
    await queryInterface.addIndex({ tableName: 'PaymentOptions', schema: 'dev_iecg' }, ['eventId'], {
      name: 'idx_payment_options_event_id'
    });

    // Adicionar índice composto para buscar formas ativas por evento
    await queryInterface.addIndex({ tableName: 'PaymentOptions', schema: 'dev_iecg' }, ['eventId', 'isActive'], {
      name: 'idx_payment_options_event_active'
    });

    console.log('✅ Tabela PaymentOptions criada com sucesso');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable({ tableName: 'PaymentOptions', schema: 'dev_iecg' });
    
    // Remover ENUMs (PostgreSQL)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PaymentOptions_paymentType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PaymentOptions_interestType";');
    
    console.log('✅ Tabela PaymentOptions removida');
  }
};
