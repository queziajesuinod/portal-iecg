require('dotenv').config();
const { Sequelize } = require('sequelize');
const migration = require('./server/migrations/20260916100000-add-ticket-channels-and-payment-receipt');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'iecg_bd',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'iecg2026',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: { searchPath: process.env.DB_SCHEMA || 'dev_iecg' },
    logging: console.log
  }
);

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conexao estabelecida!');
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    console.log('✓ Migration executada com sucesso!');
    console.log('  - Events.ticketChannels');
    console.log('  - Registrations.ticketWhatsappSentAt / ticketWhatsappLastError');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar migration:', error);
    await sequelize.close();
    process.exit(1);
  }
}

run();
