'use strict';
/* eslint-disable import/no-dynamic-require */

const fs = require('fs'); // Declarado uma única vez
const path = require('path');
const Sequelize = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '..', 'config', 'config.js'))[env];
const db = {};
const parsedPoolMax = Number(process.env.DB_POOL_MAX);
const parsedPoolMin = Number(process.env.DB_POOL_MIN);
const parsedPoolAcquire = Number(process.env.DB_POOL_ACQUIRE_MS);
const parsedPoolIdle = Number(process.env.DB_POOL_IDLE_MS);
const parsedPoolEvict = Number(process.env.DB_POOL_EVICT_MS);

const enableSequelizeLogging = process.env.SEQUELIZE_LOGGING === 'true';
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    dialectOptions: config.dialectOptions,
    pool: {
      max: Number.isFinite(parsedPoolMax) && parsedPoolMax > 0 ? parsedPoolMax : 5,
      min: Number.isFinite(parsedPoolMin) && parsedPoolMin >= 0 ? parsedPoolMin : 0,
      acquire: Number.isFinite(parsedPoolAcquire) && parsedPoolAcquire > 0 ? parsedPoolAcquire : 30000,
      idle: Number.isFinite(parsedPoolIdle) && parsedPoolIdle > 0 ? parsedPoolIdle : 10000,
      evict: Number.isFinite(parsedPoolEvict) && parsedPoolEvict > 0 ? parsedPoolEvict : 1000
    },
    logging: enableSequelizeLogging ? (msg) => console.debug(`[Sequelize] ${msg}`) : false,
    define: {
      schema: process.env.DB_SCHEMA || 'dev_iecg' // 👈 Isso aplica o schema para todos os models por padrão
    }
  }
);


fs.readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    // Cada arquivo de modelo exporta uma função que recebe (sequelize, DataTypes)
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
