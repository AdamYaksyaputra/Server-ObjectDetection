require('dotenv').config();
const { Sequelize } = require('sequelize');

const logging_enable = (process.env.DB_LOGGING || 'false').toLowerCase() === 'true';
const db_port = parseInt(process.env.DB_PORT);
const db_dialect = process.env.DB_DIALECT || 'mysql';

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: db_dialect,
  port: db_port,
  logging: logging_enable,
  pool: {
    max: 10,
    min: 0,
    acquire: 120000,
    idle: 60000,
  },
  dialectOptions: {
    connectTimeout: 120000
  },
  retry: {
    max: 3
  }
});

module.exports = sequelize;