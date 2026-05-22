/**
 * Migration: indices adicionais de performance.
 *
 * Cobre filtros/buscas frequentes nao indexados ate aqui:
 * - Members: email, phone, whatsapp, createdAt, birthDate (aniversariantes),
 *   (campusId, status), (celulaId, status)
 * - Registrations: createdAt, paymentId, pixTransactionId, (eventId, createdAt)
 * - RegistrationPayments: registrationId, status, (registrationId, status)
 *
 * Idempotente: ignora indices que ja existem (codigo 42P07 do PostgreSQL).
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

    console.log('Adicionando indices adicionais de performance...');

    // Members
    await safeAddIndex('Members', ['email'], { name: 'idx_members_email', using: 'BTREE' });
    await safeAddIndex('Members', ['phone'], { name: 'idx_members_phone', using: 'BTREE' });
    await safeAddIndex('Members', ['whatsapp'], { name: 'idx_members_whatsapp', using: 'BTREE' });
    await safeAddIndex('Members', ['createdAt'], { name: 'idx_members_created_at', using: 'BTREE' });
    await safeAddIndex('Members', ['birthDate'], { name: 'idx_members_birth_date', using: 'BTREE' });
    await safeAddIndex('Members', ['campusId', 'status'], { name: 'idx_members_campus_status', using: 'BTREE' });
    await safeAddIndex('Members', ['celulaId', 'status'], { name: 'idx_members_celula_status', using: 'BTREE' });

    // Registrations
    await safeAddIndex('Registrations', ['createdAt'], { name: 'idx_registrations_created_at', using: 'BTREE' });
    await safeAddIndex('Registrations', ['paymentId'], { name: 'idx_registrations_payment_id', using: 'BTREE' });
    await safeAddIndex('Registrations', ['pixTransactionId'], { name: 'idx_registrations_pix_tx_id', using: 'BTREE' });
    await safeAddIndex('Registrations', ['eventId', 'createdAt'], { name: 'idx_registrations_event_created', using: 'BTREE' });

    // RegistrationPayments
    await safeAddIndex('RegistrationPayments', ['registrationId'], { name: 'idx_reg_payments_registration_id', using: 'BTREE' });
    await safeAddIndex('RegistrationPayments', ['status'], { name: 'idx_reg_payments_status', using: 'BTREE' });
    await safeAddIndex('RegistrationPayments', ['registrationId', 'status'], { name: 'idx_reg_payments_reg_status', using: 'BTREE' });

    console.log('Indices adicionais processados com sucesso');
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

    await safeRemoveIndex('RegistrationPayments', 'idx_reg_payments_reg_status');
    await safeRemoveIndex('RegistrationPayments', 'idx_reg_payments_status');
    await safeRemoveIndex('RegistrationPayments', 'idx_reg_payments_registration_id');

    await safeRemoveIndex('Registrations', 'idx_registrations_event_created');
    await safeRemoveIndex('Registrations', 'idx_registrations_pix_tx_id');
    await safeRemoveIndex('Registrations', 'idx_registrations_payment_id');
    await safeRemoveIndex('Registrations', 'idx_registrations_created_at');

    await safeRemoveIndex('Members', 'idx_members_celula_status');
    await safeRemoveIndex('Members', 'idx_members_campus_status');
    await safeRemoveIndex('Members', 'idx_members_birth_date');
    await safeRemoveIndex('Members', 'idx_members_created_at');
    await safeRemoveIndex('Members', 'idx_members_whatsapp');
    await safeRemoveIndex('Members', 'idx_members_phone');
    await safeRemoveIndex('Members', 'idx_members_email');
  },
};
