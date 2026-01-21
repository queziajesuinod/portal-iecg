require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'iecg_bd',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'iecg2026',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
      searchPath: process.env.DB_SCHEMA || 'dev_iecg'
    },
    logging: console.log
  }
);

async function runMigrations() {
  try {
    console.log('Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('✓ Conexão estabelecida com sucesso!\n');

    // Migration 1: Users, Perfis, Permissoes
    console.log('1. Criando tabelas base (Users, Perfis, Permissoes)...');
    const migration1 = require('./server/migrations/20250224234338-create-users-perfis-permissoes');
    await migration1.up(sequelize.getQueryInterface(), Sequelize);
    console.log('✓ Tabelas base criadas!\n');

    // Migration 2: Módulo de Eventos
    console.log('2. Criando tabelas do módulo de eventos...');
    const migration2 = require('./server/migrations/20260121000000-create-events-module');
    await migration2.up(sequelize.getQueryInterface(), Sequelize);
    console.log('✓ Tabelas do módulo de eventos criadas!\n');

    console.log('========================================');
    console.log('✓ TODAS AS MIGRATIONS EXECUTADAS COM SUCESSO!');
    console.log('========================================');
    console.log('\nTabelas criadas:');
    console.log('  Base:');
    console.log('    - Users');
    console.log('    - Perfis');
    console.log('    - Permissoes');
    console.log('\n  Módulo de Eventos:');
    console.log('    - Events');
    console.log('    - EventBatches');
    console.log('    - Coupons');
    console.log('    - FormFields');
    console.log('    - Registrations');
    console.log('    - RegistrationAttendees');
    console.log('    - PaymentTransactions');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao executar migrations:', error.message);
    console.error('\nDetalhes:', error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigrations();
