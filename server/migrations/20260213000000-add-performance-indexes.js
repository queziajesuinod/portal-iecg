'use strict';

/**
 * Migration: Adicionar índices para otimização de performance
 * 
 * Esta migration adiciona índices estratégicos nas tabelas principais
 * para melhorar significativamente a performance das queries mais utilizadas.
 * 
 * Ganho estimado: 5-8 segundos (40-60% de melhoria) nas queries de eventos
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    console.log('🚀 Adicionando índices de performance...');
    
    try {
      // ============================================
      // ÍNDICES NA TABELA Events
      // ============================================
      
      // Índice para busca por ID e isActive (query mais comum)
      await queryInterface.addIndex(
        { tableName: 'Events', schema },
        ['id', 'isActive'],
        {
          name: 'idx_events_id_active',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_events_id_active criado');
      
      // Índice para filtro por isActive
      await queryInterface.addIndex(
        { tableName: 'Events', schema },
        ['isActive'],
        {
          name: 'idx_events_active',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_events_active criado');
      
      // Índice para ordenação por data de criação
      await queryInterface.addIndex(
        { tableName: 'Events', schema },
        ['createdAt'],
        {
          name: 'idx_events_created_at',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_events_created_at criado');
      
      // Índice para busca por criador
      await queryInterface.addIndex(
        { tableName: 'Events', schema },
        ['createdBy'],
        {
          name: 'idx_events_created_by',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_events_created_by criado');
      
      // ============================================
      // ÍNDICES NA TABELA EventBatches
      // ============================================
      
      // Índice composto para busca de lotes ativos por evento
      await queryInterface.addIndex(
        { tableName: 'EventBatches', schema },
        ['eventId', 'isActive'],
        {
          name: 'idx_batches_event_active',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_batches_event_active criado');
      
      // Índice para ordenação por order
      await queryInterface.addIndex(
        { tableName: 'EventBatches', schema },
        ['eventId', 'order'],
        {
          name: 'idx_batches_event_order',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_batches_event_order criado');
      
      // ============================================
      // ÍNDICES NA TABELA FormFields
      // ============================================
      
      // Índice para busca de campos por evento
      await queryInterface.addIndex(
        { tableName: 'FormFields', schema },
        ['eventId'],
        {
          name: 'idx_form_fields_event_id',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_form_fields_event_id criado');
      
      // Índice para ordenação por order
      await queryInterface.addIndex(
        { tableName: 'FormFields', schema },
        ['eventId', 'order'],
        {
          name: 'idx_form_fields_event_order',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_form_fields_event_order criado');
      
      // Índice para busca por section
      await queryInterface.addIndex(
        { tableName: 'FormFields', schema },
        ['eventId', 'section'],
        {
          name: 'idx_form_fields_event_section',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_form_fields_event_section criado');
      
      // ============================================
      // ÍNDICES NA TABELA PaymentOptions
      // ============================================
      
      // Índice para busca de opções de pagamento ativas por evento
      await queryInterface.addIndex(
        { tableName: 'PaymentOptions', schema },
        ['eventId', 'isActive'],
        {
          name: 'idx_payment_options_event_active',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_payment_options_event_active criado');
      
      // ============================================
      // ÍNDICES NA TABELA Registrations
      // ============================================
      
      // Índice para busca de inscrições por evento
      await queryInterface.addIndex(
        { tableName: 'Registrations', schema },
        ['eventId'],
        {
          name: 'idx_registrations_event_id',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_registrations_event_id criado');
      
      // Índice para busca por status de pagamento
      await queryInterface.addIndex(
        { tableName: 'Registrations', schema },
        ['paymentStatus'],
        {
          name: 'idx_registrations_payment_status',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_registrations_payment_status criado');
      
      // Índice composto para contagem de inscrições por evento e status
      await queryInterface.addIndex(
        { tableName: 'Registrations', schema },
        ['eventId', 'paymentStatus'],
        {
          name: 'idx_registrations_event_status',
          using: 'BTREE',
        }
      );
      console.log('✅ Índice idx_registrations_event_status criado');
      
      // Índice para busca por orderCode (usado na consulta pública)
      await queryInterface.addIndex(
        { tableName: 'Registrations', schema },
        ['orderCode'],
        {
          name: 'idx_registrations_order_code',
          using: 'BTREE',
          unique: true,
        }
      );
      console.log('✅ Índice idx_registrations_order_code criado');
      
      console.log('🎉 Todos os índices foram criados com sucesso!');
      console.log('📊 Performance esperada: melhoria de 40-60% nas queries de eventos');
      
    } catch (error) {
      console.error('❌ Erro ao criar índices:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    console.log('🔄 Removendo índices de performance...');
    
    try {
      // Remover índices na ordem inversa
      await queryInterface.removeIndex({ tableName: 'Registrations', schema }, 'idx_registrations_order_code');
      await queryInterface.removeIndex({ tableName: 'Registrations', schema }, 'idx_registrations_event_status');
      await queryInterface.removeIndex({ tableName: 'Registrations', schema }, 'idx_registrations_payment_status');
      await queryInterface.removeIndex({ tableName: 'Registrations', schema }, 'idx_registrations_event_id');
      
      await queryInterface.removeIndex({ tableName: 'PaymentOptions', schema }, 'idx_payment_options_event_active');
      
      await queryInterface.removeIndex({ tableName: 'FormFields', schema }, 'idx_form_fields_event_section');
      await queryInterface.removeIndex({ tableName: 'FormFields', schema }, 'idx_form_fields_event_order');
      await queryInterface.removeIndex({ tableName: 'FormFields', schema }, 'idx_form_fields_event_id');
      
      await queryInterface.removeIndex({ tableName: 'EventBatches', schema }, 'idx_batches_event_order');
      await queryInterface.removeIndex({ tableName: 'EventBatches', schema }, 'idx_batches_event_active');
      
      await queryInterface.removeIndex({ tableName: 'Events', schema }, 'idx_events_created_by');
      await queryInterface.removeIndex({ tableName: 'Events', schema }, 'idx_events_created_at');
      await queryInterface.removeIndex({ tableName: 'Events', schema }, 'idx_events_active');
      await queryInterface.removeIndex({ tableName: 'Events', schema }, 'idx_events_id_active');
      
      console.log('✅ Todos os índices foram removidos');
      
    } catch (error) {
      console.error('❌ Erro ao remover índices:', error);
      throw error;
    }
  }
};
