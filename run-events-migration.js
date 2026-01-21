require('dotenv').config();
const { Sequelize } = require('sequelize');
const migration = require('./server/migrations/20260121000000-create-events-module');

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

async function runMigration() {
  try {
    console.log('Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('✓ Conexão estabelecida com sucesso!');

    console.log('\nExecutando migration do módulo de eventos...');
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    console.log('✓ Migration executada com sucesso!');

    console.log('\nTabelas criadas:');
    console.log('  - Events');
    console.log('  - EventBatches');
    console.log('  - Coupons');
    console.log('  - FormFields');
    console.log('  - Registrations');
    console.log('  - RegistrationAttendees');
    console.log('  - PaymentTransactions');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar migration:', error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
