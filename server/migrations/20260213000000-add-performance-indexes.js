'use strict';

/**
 * Migration: adiciona indices para otimizar performance.
 * Esta versao e idempotente (nao falha se indice ja existir).
 */

module.exports = {
  up: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    const safeAddIndex = async (tableName, fields, options) => {
      try {
        await queryInterface.addIndex({ tableName, schema }, fields, options);
        console.log(`Index ${options.name} criado`);
      } catch (error) {
        if (error?.original?.code === '42P07') {
          console.log(`Index ${options.name} ja existe, ignorando`);
          return;
        }
        throw error;
      }
    };

    console.log('Adicionando indices de performance...');

    try {
      await safeAddIndex('Events', ['id', 'isActive'], { name: 'idx_events_id_active', using: 'BTREE' });
      await safeAddIndex('Events', ['isActive'], { name: 'idx_events_active', using: 'BTREE' });
      await safeAddIndex('Events', ['createdAt'], { name: 'idx_events_created_at', using: 'BTREE' });
      await safeAddIndex('Events', ['createdBy'], { name: 'idx_events_created_by', using: 'BTREE' });

      await safeAddIndex('EventBatches', ['eventId', 'isActive'], { name: 'idx_batches_event_active', using: 'BTREE' });
      await safeAddIndex('EventBatches', ['eventId', 'order'], { name: 'idx_batches_event_order', using: 'BTREE' });

      await safeAddIndex('FormFields', ['eventId'], { name: 'idx_form_fields_event_id', using: 'BTREE' });
      await safeAddIndex('FormFields', ['eventId', 'order'], { name: 'idx_form_fields_event_order', using: 'BTREE' });
      await safeAddIndex('FormFields', ['eventId', 'section'], { name: 'idx_form_fields_event_section', using: 'BTREE' });

      await safeAddIndex('PaymentOptions', ['eventId', 'isActive'], { name: 'idx_payment_options_event_active', using: 'BTREE' });

      await safeAddIndex('Registrations', ['eventId'], { name: 'idx_registrations_event_id', using: 'BTREE' });
      await safeAddIndex('Registrations', ['paymentStatus'], { name: 'idx_registrations_payment_status', using: 'BTREE' });
      await safeAddIndex('Registrations', ['eventId', 'paymentStatus'], { name: 'idx_registrations_event_status', using: 'BTREE' });
      await safeAddIndex('Registrations', ['orderCode'], {
        name: 'idx_registrations_order_code',
        using: 'BTREE',
        unique: true,
      });

      console.log('Todos os indices foram processados com sucesso');
    } catch (error) {
      console.error('Erro ao criar indices:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';

    const safeRemoveIndex = async (tableName, indexName) => {
      try {
        await queryInterface.removeIndex({ tableName, schema }, indexName);
      } catch (error) {
        if (error?.original?.code === '42704') {
          console.log(`Index ${indexName} nao existe, ignorando`);
          return;
        }
        throw error;
      }
    };

    console.log('Removendo indices de performance...');

    try {
      await safeRemoveIndex('Registrations', 'idx_registrations_order_code');
      await safeRemoveIndex('Registrations', 'idx_registrations_event_status');
      await safeRemoveIndex('Registrations', 'idx_registrations_payment_status');
      await safeRemoveIndex('Registrations', 'idx_registrations_event_id');

      await safeRemoveIndex('PaymentOptions', 'idx_payment_options_event_active');

      await safeRemoveIndex('FormFields', 'idx_form_fields_event_section');
      await safeRemoveIndex('FormFields', 'idx_form_fields_event_order');
      await safeRemoveIndex('FormFields', 'idx_form_fields_event_id');

      await safeRemoveIndex('EventBatches', 'idx_batches_event_order');
      await safeRemoveIndex('EventBatches', 'idx_batches_event_active');

      await safeRemoveIndex('Events', 'idx_events_created_by');
      await safeRemoveIndex('Events', 'idx_events_created_at');
      await safeRemoveIndex('Events', 'idx_events_active');
      await safeRemoveIndex('Events', 'idx_events_id_active');

      console.log('Todos os indices foram removidos');
    } catch (error) {
      console.error('Erro ao remover indices:', error);
      throw error;
    }
  },
};
