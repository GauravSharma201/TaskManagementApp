import { Sequelize } from 'sequelize';
import { DatabaseConfig } from '../types';
import logger from '../utils/logger';

const config = require('../../config/database');

const env: string = process.env['NODE_ENV'] || 'development';
const dbConfig: DatabaseConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging === false ? false : (msg: string) => logger.info(msg),
    ...(dbConfig.pool && { pool: dbConfig.pool }),
    dialectOptions: dbConfig.dialectOptions || {}
  }
);

// Test the connection
const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

export { sequelize, testConnection };